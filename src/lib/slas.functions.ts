import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type SlaTargetType = Database["public"]["Enums"]["sla_target_type"];
type BreachStatus = Database["public"]["Enums"]["breach_status"];

export const SLA_TARGET_TYPES = [
  "uptime_pct",
  "response_minutes",
  "resolution_minutes",
  "custom",
] as const satisfies readonly SlaTargetType[];

export const BREACH_STATUSES = [
  "open",
  "remediated",
  "escalated",
  "closed_no_action",
] as const satisfies readonly BreachStatus[];

export type SlaRow = Database["public"]["Tables"]["slas"]["Row"] & {
  vendor: { id: string; name: string } | null;
  system: { id: string; name: string } | null;
  is_overdue: boolean;
};
export type BreachRow = Database["public"]["Tables"]["sla_breaches"]["Row"];

const slaWriteSchema = z.object({
  vendor_id: z.string().uuid(),
  system_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  target_type: z.enum(SLA_TARGET_TYPES),
  target_value: z.coerce.number(),
  review_cadence_days: z.coerce.number().int().min(1).max(3650).default(90),
  last_reviewed_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type SlaWriteInput = z.infer<typeof slaWriteSchema>;

const breachWriteSchema = z.object({
  sla_id: z.string().uuid(),
  occurred_at: z.string().min(1),
  detected_at: z.string().nullable().optional(),
  impact_summary: z.string().trim().min(1).max(1000),
  status: z.enum(BREACH_STATUSES).default("open"),
  remediation_notes: z.string().nullable().optional(),
});
export type BreachWriteInput = z.infer<typeof breachWriteSchema>;

async function attachVendorSystem(supabase: any, slas: any[]) {
  const vendorIds = Array.from(new Set(slas.map((s) => s.vendor_id).filter(Boolean))) as string[];
  const systemIds = Array.from(new Set(slas.map((s) => s.system_id).filter(Boolean))) as string[];
  const vendorsP = vendorIds.length
    ? supabase.from("vendors").select("id, name").in("id", vendorIds)
    : Promise.resolve({ data: [] });
  const systemsP = systemIds.length
    ? supabase.from("systems").select("id, name").in("id", systemIds)
    : Promise.resolve({ data: [] });
  const [{ data: vendors }, { data: systems }] = await Promise.all([vendorsP, systemsP]);
  const vMap = new Map((vendors ?? []).map((v: any) => [v.id, v]));
  const sMap = new Map((systems ?? []).map((s: any) => [s.id, s]));

  const overdueIds = await loadOverdueIds(supabase, slas.map((s) => s.id));

  return slas.map((s) => ({
    ...s,
    vendor: s.vendor_id ? vMap.get(s.vendor_id) ?? null : null,
    system: s.system_id ? sMap.get(s.system_id) ?? null : null,
    is_overdue: overdueIds.has(s.id),
  }));
}

async function loadOverdueIds(supabase: any, ids: string[]) {
  const set = new Set<string>();
  if (ids.length === 0) return set;
  const { data, error } = await supabase
    .from("v_sla_review_status")
    .select("sla_id, is_overdue")
    .in("sla_id", ids);
  if (error) throw new Error(error.message);
  for (const r of data ?? []) if ((r as any).is_overdue) set.add((r as any).sla_id);
  return set;
}

export const listSlas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      vendorId: z.string().uuid().optional(),
      systemId: z.string().uuid().optional(),
      search: z.string().optional(),
      includeArchived: z.boolean().default(false),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<SlaRow[]> => {
    const { supabase } = context;
    let q = supabase.from("slas").select("*").order("name", { ascending: true });
    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.vendorId) q = q.eq("vendor_id", data.vendorId);
    if (data.systemId) q = q.eq("system_id", data.systemId);
    if (data.search?.trim()) q = q.ilike("name", `%${data.search.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (await attachVendorSystem(supabase, rows ?? [])) as SlaRow[];
  });

export const getSla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<SlaRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("slas").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const [enriched] = await attachVendorSystem(supabase, [row]);
    return enriched as SlaRow;
  });

export const createSla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => slaWriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("slas")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*").single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "sla.create",
      _entity_type: "slas",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updateSla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: slaWriteSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: prev, error: prevErr } = await supabase.from("slas").select("*").eq("id", data.id).single();
    if (prevErr) throw new Error(prevErr.message);
    const { data: next, error } = await supabase
      .from("slas").update(data.patch).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);

    const before: Record<string, Json> = {};
    const after: Record<string, Json> = {};
    for (const k of Object.keys(data.patch)) {
      if (JSON.stringify((prev as any)[k]) !== JSON.stringify((next as any)[k])) {
        before[k] = (prev as any)[k];
        after[k] = (next as any)[k];
      }
    }
    if (Object.keys(after).length > 0) {
      await supabase.rpc("log_audit", {
        _action: "sla.update",
        _entity_type: "slas",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }
    return next;
  });

export const listBreaches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      slaId: z.string().uuid().optional(),
      vendorId: z.string().uuid().optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<BreachRow[]> => {
    const { supabase } = context;
    let slaIds: string[] | null = null;
    if (data.vendorId) {
      const { data: slaRows, error } = await supabase
        .from("slas").select("id").eq("vendor_id", data.vendorId);
      if (error) throw new Error(error.message);
      slaIds = (slaRows ?? []).map((r: any) => r.id);
      if (slaIds.length === 0) return [];
    }
    let q = supabase.from("sla_breaches").select("*").order("occurred_at", { ascending: false });
    if (data.slaId) q = q.eq("sla_id", data.slaId);
    if (slaIds) q = q.in("sla_id", slaIds);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createBreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => breachWriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("sla_breaches")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*").single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "breach.create",
      _entity_type: "sla_breaches",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updateBreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        status: z.enum(BREACH_STATUSES).optional(),
        impact_summary: z.string().min(1).max(1000).optional(),
        remediation_notes: z.string().nullable().optional(),
        detected_at: z.string().nullable().optional(),
        occurred_at: z.string().optional(),
        closed_at: z.string().nullable().optional(),
      }),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("sla_breaches").select("*").eq("id", data.id).single();
    if (prevErr) throw new Error(prevErr.message);

    const patch: Record<string, any> = { ...data.patch };
    // Auto-stamp closed_at when transitioning into a closed status.
    if (patch.status && patch.status !== "open" && !prev.closed_at && patch.closed_at === undefined) {
      patch.closed_at = new Date().toISOString();
    }

    const { data: next, error } = await supabase
      .from("sla_breaches").update(patch).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);

    const before: Record<string, Json> = {};
    const after: Record<string, Json> = {};
    for (const k of Object.keys(patch)) {
      if (JSON.stringify((prev as any)[k]) !== JSON.stringify((next as any)[k])) {
        before[k] = (prev as any)[k];
        after[k] = (next as any)[k];
      }
    }
    if (Object.keys(after).length > 0) {
      await supabase.rpc("log_audit", {
        _action: "breach.update",
        _entity_type: "sla_breaches",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }
    return next;
  });

export const listSlaAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ slaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, before, after, created_at, actor_id")
      .eq("entity_type", "slas")
      .eq("entity_id", data.slaId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const actorIds = Array.from(new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean))) as string[];
    let actors = new Map<string, any>();
    if (actorIds.length) {
      const { data: us } = await supabase.from("users").select("id, full_name, email").in("id", actorIds);
      actors = new Map((us ?? []).map((u: any) => [u.id, u]));
    }
    return (rows ?? []).map((r: any) => ({ ...r, actor: r.actor_id ? actors.get(r.actor_id) ?? null : null }));
  });

export const searchVendors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ q: z.string().max(200).optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("vendors").select("id, name").is("archived_at", null)
      .order("name", { ascending: true }).limit(20);
    if (data.q?.trim()) q = q.ilike("name", `%${data.q.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
