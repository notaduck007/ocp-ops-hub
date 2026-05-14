import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { attachActors } from "@/lib/load-actors";

type OwnerLite = { id: string; full_name: string | null; email: string };

type SystemCategory = Database["public"]["Enums"]["system_category"];
type Criticality = Database["public"]["Enums"]["criticality"];
type DataClass = Database["public"]["Enums"]["data_class"];

export type SystemRow = Database["public"]["Tables"]["systems"]["Row"] & {
  business_owner: { id: string; full_name: string | null; email: string } | null;
  technical_owner: { id: string; full_name: string | null; email: string } | null;
};

const SYSTEM_CATEGORIES = [
  "idp",
  "github",
  "crm",
  "cms",
  "storage",
  "finance",
  "event",
  "security",
  "collab",
  "other",
] as const satisfies readonly SystemCategory[];

const CRITICALITIES = ["low", "medium", "high", "critical"] as const satisfies readonly Criticality[];

const DATA_CLASSES = [
  "none",
  "member_pii",
  "staff_pii",
  "financial",
  "unpublished_spec",
  "public",
] as const satisfies readonly DataClass[];

const writeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.enum(SYSTEM_CATEGORIES),
  criticality: z.enum(CRITICALITIES).default("medium"),
  description: z.string().nullable().optional(),
  url: z
    .string()
    .trim()
    .url()
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  business_owner_id: z.string().uuid().nullable().optional(),
  technical_owner_id: z.string().uuid().nullable().optional(),
  data_classes: z.array(z.enum(DATA_CLASSES)).default([]),
  mfa_required: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

export type SystemWriteInput = z.infer<typeof writeSchema>;

async function loadOwners(supabase: any, ids: string[]): Promise<Map<string, OwnerLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", unique);
  if (error) throw new Error(error.message);
  return new Map<string, OwnerLite>(
    (data ?? []).map((u: OwnerLite) => [u.id, u] as const),
  );
}

async function assertAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const listSystems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().optional(),
        category: z.enum(SYSTEM_CATEGORIES).optional(),
        criticality: z.enum(CRITICALITIES).optional(),
        ownerId: z.string().uuid().optional(),
        includeArchived: z.boolean().default(false),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<SystemRow[]> => {
    const { supabase } = context;
    let q = supabase.from("systems").select("*").order("updated_at", { ascending: false });

    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.category) q = q.eq("category", data.category);
    if (data.criticality) q = q.eq("criticality", data.criticality);
    if (data.search && data.search.trim()) q = q.ilike("name", `%${data.search.trim()}%`);
    if (data.ownerId)
      q = q.or(`business_owner_id.eq.${data.ownerId},technical_owner_id.eq.${data.ownerId}`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).flatMap((r: any) =>
      [r.business_owner_id, r.technical_owner_id].filter(Boolean) as string[],
    );
    const owners = await loadOwners(supabase, ids);

    return (rows ?? []).map((r: any) => ({
      ...r,
      business_owner: r.business_owner_id ? owners.get(r.business_owner_id) ?? null : null,
      technical_owner: r.technical_owner_id ? owners.get(r.technical_owner_id) ?? null : null,
    }));
  });

export const getSystem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<SystemRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("systems")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const owners = await loadOwners(
      supabase,
      [row.business_owner_id, row.technical_owner_id].filter(Boolean) as string[],
    );
    return attachActors(supabase, {
      ...row,
      business_owner: row.business_owner_id ? owners.get(row.business_owner_id) ?? null : null,
      technical_owner: row.technical_owner_id ? owners.get(row.technical_owner_id) ?? null : null,
    }) as any;
  });

export const createSystem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => writeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("systems")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "system.create",
      _entity_type: "systems",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });

    return row;
  });

export const updateSystem = createServerFn({ method: "POST" })
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
    const { supabase } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("systems")
      .select("*")
      .eq("id", data.id)
      .single();
    if (prevErr) throw new Error(prevErr.message);

    const { data: next, error } = await supabase
      .from("systems")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Diff only the changed fields.
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
        _action: "system.update",
        _entity_type: "systems",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }

    return next;
  });

export const archiveSystem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);

    const archived_at = data.archive ? new Date().toISOString() : null;
    const { data: prev } = await supabase
      .from("systems")
      .select("archived_at")
      .eq("id", data.id)
      .single();

    const { error } = await supabase
      .from("systems")
      .update({ archived_at })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: data.archive ? "system.archive" : "system.unarchive",
      _entity_type: "systems",
      _entity_id: data.id,
      _before: { archived_at: prev?.archived_at ?? null },
      _after: { archived_at },
    });

    return { ok: true as const };
  });

export type SystemAuditEntry = {
  id: string;
  action: string;
  before: Json | null;
  after: Json | null;
  created_at: string;
  actor: OwnerLite | null;
};

export const listSystemAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ systemId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<SystemAuditEntry[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, before, after, created_at, actor_id")
      .eq("entity_type", "systems")
      .eq("entity_id", data.systemId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const actorIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)),
    ) as string[];
    const actors = await loadOwners(supabase, actorIds);

    return (rows ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      before: r.before,
      after: r.after,
      created_at: r.created_at,
      actor: r.actor_id ? actors.get(r.actor_id) ?? null : null,
    }));
  });

export const searchUsersForOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().max(200).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("users")
      .select("id, full_name, email")
      .order("full_name", { ascending: true })
      .limit(20);
    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      q = q.or(`full_name.ilike.${term},email.ilike.${term}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as { id: string; full_name: string | null; email: string }[];
  });

export { SYSTEM_CATEGORIES, CRITICALITIES, DATA_CLASSES };
