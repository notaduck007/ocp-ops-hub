import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { attachActors } from "@/lib/load-actors";

type PersonType = Database["public"]["Enums"]["person_type"];
type PersonStatus = Database["public"]["Enums"]["person_status"];
type AccessRoleLevel = Database["public"]["Enums"]["access_role_level"];
type SystemCategory = Database["public"]["Enums"]["system_category"];

export const PERSON_TYPES = [
  "staff",
  "contractor",
  "vendor_user",
  "service_account",
] as const satisfies readonly PersonType[];

export const PERSON_STATUSES = [
  "active",
  "inactive",
  "offboarded",
] as const satisfies readonly PersonStatus[];

export const ACCESS_ROLE_LEVELS = [
  "read",
  "write",
  "admin",
  "owner",
] as const satisfies readonly AccessRoleLevel[];

const SYSTEM_CATEGORIES_LIST = [
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

export type PersonRow = Database["public"]["Tables"]["people"]["Row"];
export type AccessGrantRow = Database["public"]["Tables"]["access_grants"]["Row"];

export type AccessGrantWithRefs = AccessGrantRow & {
  person: { id: string; full_name: string; email: string | null; type: PersonType } | null;
  system: { id: string; name: string; category: SystemCategory } | null;
};

const personWriteSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z
    .string()
    .trim()
    .email()
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  type: z.enum(PERSON_TYPES),
  status: z.enum(PERSON_STATUSES).default("active"),
  employer: z.string().nullable().optional(),
  employment_start: z.string().nullable().optional(),
  employment_end: z.string().nullable().optional(),
  linked_user_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type PersonWriteInput = z.infer<typeof personWriteSchema>;

const grantWriteSchema = z.object({
  person_id: z.string().uuid(),
  system_id: z.string().uuid(),
  role_level: z.enum(ACCESS_ROLE_LEVELS),
  is_admin: z.boolean().default(false),
  granted_at: z.string().nullable().optional(),
  last_used_at: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type AccessGrantWriteInput = z.infer<typeof grantWriteSchema>;

async function assertAdmin(supabase: any) {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

// ---------- People ----------

export const listPeople = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().optional(),
        type: z.enum(PERSON_TYPES).optional(),
        status: z.enum(PERSON_STATUSES).optional(),
        includeArchived: z.boolean().default(false),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<PersonRow[]> => {
    const { supabase } = context;
    let q = supabase.from("people").select("*").order("full_name", { ascending: true });
    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.type) q = q.eq("type", data.type);
    if (data.status) q = q.eq("status", data.status);
    if (data.search && data.search.trim()) {
      const term = `%${data.search.trim()}%`;
      q = q.or(`full_name.ilike.${term},email.ilike.${term},employer.ilike.${term}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<PersonRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("people")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return (await attachActors(supabase, row)) as any;
  });

export const createPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => personWriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("people")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "person.create",
      _entity_type: "people",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updatePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), patch: personWriteSchema.partial() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("people")
      .select("*")
      .eq("id", data.id)
      .single();
    if (prevErr) throw new Error(prevErr.message);

    const { data: next, error } = await supabase
      .from("people")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
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
        _action: "person.update",
        _entity_type: "people",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }
    return next;
  });

export const archivePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);
    const archived_at = data.archive ? new Date().toISOString() : null;
    const { data: prev } = await supabase
      .from("people")
      .select("archived_at")
      .eq("id", data.id)
      .single();
    const { error } = await supabase
      .from("people")
      .update({ archived_at })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: data.archive ? "person.archive" : "person.unarchive",
      _entity_type: "people",
      _entity_id: data.id,
      _before: { archived_at: prev?.archived_at ?? null },
      _after: { archived_at },
    });
    return { ok: true as const };
  });

export type PersonAuditEntry = {
  id: string;
  action: string;
  before: Json | null;
  after: Json | null;
  created_at: string;
  actor: { id: string; full_name: string | null; email: string } | null;
};

export const listPersonAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ personId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<PersonAuditEntry[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, before, after, created_at, actor_id")
      .eq("entity_type", "people")
      .eq("entity_id", data.personId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const actorIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)),
    ) as string[];
    const actors = new Map<string, { id: string; full_name: string | null; email: string }>();
    if (actorIds.length) {
      const { data: u } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", actorIds);
      (u ?? []).forEach((row: any) => actors.set(row.id, row));
    }
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      before: r.before,
      after: r.after,
      created_at: r.created_at,
      actor: r.actor_id ? actors.get(r.actor_id) ?? null : null,
    }));
  });

// ---------- Access Grants ----------

async function enrichGrants(
  supabase: any,
  rows: AccessGrantRow[],
): Promise<AccessGrantWithRefs[]> {
  if (rows.length === 0) return [];
  const personIds = Array.from(new Set(rows.map((r) => r.person_id)));
  const systemIds = Array.from(new Set(rows.map((r) => r.system_id)));
  const [{ data: people }, { data: systems }] = await Promise.all([
    supabase.from("people").select("id, full_name, email, type").in("id", personIds),
    supabase.from("systems").select("id, name, category").in("id", systemIds),
  ]);
  const pMap = new Map<string, any>((people ?? []).map((p: any) => [p.id, p]));
  const sMap = new Map<string, any>((systems ?? []).map((s: any) => [s.id, s]));
  return rows.map((r) => ({
    ...r,
    person: pMap.get(r.person_id) ?? null,
    system: sMap.get(r.system_id) ?? null,
  }));
}

export const listAccessGrants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        personId: z.string().uuid().optional(),
        systemId: z.string().uuid().optional(),
        personType: z.enum(PERSON_TYPES).optional(),
        systemCategory: z.enum(SYSTEM_CATEGORIES_LIST).optional(),
        adminOnly: z.boolean().optional(),
        unreviewed90d: z.boolean().optional(),
        includeArchived: z.boolean().default(false),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AccessGrantWithRefs[]> => {
    const { supabase } = context;
    let q = supabase.from("access_grants").select("*").order("updated_at", { ascending: false });
    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.personId) q = q.eq("person_id", data.personId);
    if (data.systemId) q = q.eq("system_id", data.systemId);
    if (data.adminOnly) q = q.eq("is_admin", true);
    if (data.unreviewed90d) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      q = q.or(`last_reviewed_at.is.null,last_reviewed_at.lt.${cutoff}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let enriched = await enrichGrants(supabase, (rows ?? []) as AccessGrantRow[]);
    if (data.personType) enriched = enriched.filter((g) => g.person?.type === data.personType);
    if (data.systemCategory)
      enriched = enriched.filter((g) => g.system?.category === data.systemCategory);
    return enriched;
  });

export const createAccessGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => grantWriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("access_grants")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "access_grant.create",
      _entity_type: "access_grants",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updateAccessGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), patch: grantWriteSchema.partial() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("access_grants")
      .select("*")
      .eq("id", data.id)
      .single();
    if (prevErr) throw new Error(prevErr.message);
    const { data: next, error } = await supabase
      .from("access_grants")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
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
        _action: "access_grant.update",
        _entity_type: "access_grants",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }
    return next;
  });

export const revokeAccessGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const archived_at = new Date().toISOString();
    const { error } = await supabase
      .from("access_grants")
      .update({ archived_at })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "access_grant.revoke",
      _entity_type: "access_grants",
      _entity_id: data.id,
      _before: { archived_at: null },
      _after: { archived_at },
    });
    return { ok: true as const };
  });

export const markGrantsReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const now = new Date().toISOString();
    // Read previous values so we can write per-row audit entries.
    const { data: prevRows, error: prevErr } = await supabase
      .from("access_grants")
      .select("id, last_reviewed_at")
      .in("id", data.ids);
    if (prevErr) throw new Error(prevErr.message);

    const { error } = await supabase
      .from("access_grants")
      .update({ last_reviewed_at: now })
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    // Per-row audit entries.
    for (const row of prevRows ?? []) {
      await supabase.rpc("log_audit", {
        _action: "access_grant.review",
        _entity_type: "access_grants",
        _entity_id: row.id,
        _before: { last_reviewed_at: row.last_reviewed_at },
        _after: { last_reviewed_at: now },
      });
    }
    return { ok: true as const, count: data.ids.length };
  });

export const searchSystemsForGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().max(200).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("systems")
      .select("id, name, category")
      .is("archived_at", null)
      .order("name", { ascending: true })
      .limit(20);
    if (data.q && data.q.trim()) {
      q = q.ilike("name", `%${data.q.trim()}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as { id: string; name: string; category: SystemCategory }[];
  });

export const getMfaCoverage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("v_mfa_coverage")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? { covered_count: 0, eligible_count: 0, mfa_coverage_pct: null }) as {
      covered_count: number;
      eligible_count: number;
      mfa_coverage_pct: number | null;
    };
  });
