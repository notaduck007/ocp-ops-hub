import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { attachActors } from "@/lib/load-actors";

type OwnerLite = { id: string; full_name: string | null; email: string };

export type RiskKind = Database["public"]["Enums"]["risk_kind"];
export type RiskStatus = Database["public"]["Enums"]["risk_status"];

export const RISK_KINDS = ["risk", "exception"] as const satisfies readonly RiskKind[];
export const RISK_STATUSES = [
  "open",
  "mitigating",
  "accepted",
  "closed",
] as const satisfies readonly RiskStatus[];

export type RiskRow = Database["public"]["Tables"]["risks"]["Row"] & {
  owner: OwnerLite | null;
  accepter: OwnerLite | null;
  system: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
};

const writeSchema = z.object({
  kind: z.enum(RISK_KINDS),
  title: z.string().trim().min(1).max(200),
  description: z.string().nullable().optional(),
  severity: z.number().int().min(1).max(4),
  likelihood: z.number().int().min(1).max(4),
  status: z.enum(RISK_STATUSES).default("open"),
  owner_id: z.string().uuid(),
  system_id: z.string().uuid().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  policy_id: z.string().uuid().nullable().optional(),
  accepted_until: z.string().nullable().optional(),
  acceptance_justification: z.string().nullable().optional(),
  next_review_due_at: z.string().nullable().optional(),
  review_cadence_days: z.number().int().min(1).max(3650).default(90),
  notes: z.string().nullable().optional(),
});

export type RiskWriteInput = z.infer<typeof writeSchema>;

async function loadUsers(supabase: any, ids: string[]): Promise<Map<string, OwnerLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("users").select("id, full_name, email").in("id", unique);
  if (error) throw new Error(error.message);
  return new Map<string, OwnerLite>((data ?? []).map((u: OwnerLite) => [u.id, u] as const));
}

async function loadSystems(supabase: any, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, { id: string; name: string }>();
  const { data, error } = await supabase.from("systems").select("id, name").in("id", unique);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r: any) => [r.id, r] as const));
}

async function loadVendors(supabase: any, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, { id: string; name: string }>();
  const { data, error } = await supabase.from("vendors").select("id, name").in("id", unique);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r: any) => [r.id, r] as const));
}

async function decorate(supabase: any, rows: any[]): Promise<RiskRow[]> {
  const userIds = rows.flatMap((r) => [r.owner_id, r.accepted_by].filter(Boolean) as string[]);
  const sysIds = rows.map((r) => r.system_id).filter(Boolean) as string[];
  const venIds = rows.map((r) => r.vendor_id).filter(Boolean) as string[];
  const [users, systems, vendors] = await Promise.all([
    loadUsers(supabase, userIds),
    loadSystems(supabase, sysIds),
    loadVendors(supabase, venIds),
  ]);
  return rows.map((r) => ({
    ...r,
    owner: r.owner_id ? users.get(r.owner_id) ?? null : null,
    accepter: r.accepted_by ? users.get(r.accepted_by) ?? null : null,
    system: r.system_id ? (systems.get(r.system_id) as any) ?? null : null,
    vendor: r.vendor_id ? (vendors.get(r.vendor_id) as any) ?? null : null,
  }));
}

export const listRisks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(RISK_KINDS).optional(),
        status: z.enum(RISK_STATUSES).optional(),
        severityGte: z.number().int().min(1).max(4).optional(),
        ownerId: z.string().uuid().optional(),
        overdueOnly: z.boolean().default(false),
        includeArchived: z.boolean().default(false),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<RiskRow[]> => {
    const { supabase } = context;
    let q = supabase.from("risks").select("*").order("score", { ascending: false });
    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.status) q = q.eq("status", data.status);
    if (typeof data.severityGte === "number") q = q.gte("severity", data.severityGte);
    if (data.ownerId) q = q.eq("owner_id", data.ownerId);
    if (data.overdueOnly) q = q.lt("next_review_due_at", new Date().toISOString());

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return decorate(supabase, rows ?? []);
  });

export const getRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RiskRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("risks").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const decorated = await decorate(supabase, [row]);
    return decorated[0] ?? null;
  });

async function isAdmin(supabase: any): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  return !!data;
}

export const createRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => writeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.status === "accepted" || data.status === "closed") {
      if (!(await isAdmin(supabase))) {
        throw new Error("Only admins can create risks with accepted/closed status");
      }
    }

    const insert: any = { ...data, created_by: userId, updated_by: userId };
    if (data.status === "accepted") {
      insert.accepted_by = userId;
      insert.accepted_at = new Date().toISOString();
    }

    const { data: row, error } = await supabase.from("risks").insert(insert).select("*").single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "risk.create",
      _entity_type: "risks",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updateRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: writeSchema.partial(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prev, error: prevErr } = await supabase
      .from("risks")
      .select("*")
      .eq("id", data.id)
      .single();
    if (prevErr) throw new Error(prevErr.message);

    const transitionToAccepted =
      data.patch.status === "accepted" && prev.status !== "accepted";
    const transitionToClosed =
      data.patch.status === "closed" && prev.status !== "closed";

    if (transitionToAccepted || transitionToClosed) {
      if (!(await isAdmin(supabase))) {
        throw new Error("Only admins can accept or close a risk");
      }
    }

    if (transitionToAccepted) {
      if (!data.patch.accepted_until) {
        throw new Error("accepted_until is required when accepting a risk");
      }
      if (!data.patch.acceptance_justification?.trim()) {
        throw new Error("Justification is required when accepting a risk");
      }
    }

    const patch: any = { ...data.patch };
    if (transitionToAccepted) {
      patch.accepted_by = userId;
      patch.accepted_at = new Date().toISOString();
    }

    const { data: next, error } = await supabase
      .from("risks")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const before: Record<string, Json> = {};
    const after: Record<string, Json> = {};
    const keys = new Set([
      ...Object.keys(data.patch),
      ...(transitionToAccepted ? ["accepted_by", "accepted_at"] : []),
    ]);
    for (const k of keys) {
      if (JSON.stringify((prev as any)[k]) !== JSON.stringify((next as any)[k])) {
        before[k] = (prev as any)[k];
        after[k] = (next as any)[k];
      }
    }
    if (Object.keys(after).length > 0) {
      const action = transitionToAccepted
        ? "risk.accept"
        : transitionToClosed
          ? "risk.close"
          : "risk.update";
      await supabase.rpc("log_audit", {
        _action: action,
        _entity_type: "risks",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }

    return next;
  });

export type RiskAuditEntry = {
  id: string;
  action: string;
  before: Json | null;
  after: Json | null;
  created_at: string;
  actor: OwnerLite | null;
};

export const listRiskAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ riskId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RiskAuditEntry[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, before, after, created_at, actor_id")
      .eq("entity_type", "risks")
      .eq("entity_id", data.riskId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const actorIds = Array.from(new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean))) as string[];
    const actors = await loadUsers(supabase, actorIds);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      before: r.before,
      after: r.after,
      created_at: r.created_at,
      actor: r.actor_id ? actors.get(r.actor_id) ?? null : null,
    }));
  });
