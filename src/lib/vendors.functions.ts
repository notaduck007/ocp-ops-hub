import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { attachActors } from "@/lib/load-actors";

type VendorStatus = Database["public"]["Enums"]["vendor_status"];

export const VENDOR_STATUSES = [
  "active",
  "onboarding",
  "offboarding",
  "terminated",
] as const satisfies readonly VendorStatus[];

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"] & {
  internal_owner: { id: string; full_name: string | null; email: string } | null;
  linked_systems_count: number;
  created_by_user: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
  updated_by_user: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null;
};

const writeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  status: z.enum(VENDOR_STATUSES).default("active"),
  website: z.string().trim().url().or(z.literal("")).nullable().optional()
    .transform((v) => (v ? v : null)),
  primary_contact_name: z.string().nullable().optional(),
  primary_contact_email: z.string().trim().email().or(z.literal("")).nullable().optional()
    .transform((v) => (v ? v : null)),
  escalation_contact_name: z.string().nullable().optional(),
  escalation_contact_email: z.string().trim().email().or(z.literal("")).nullable().optional()
    .transform((v) => (v ? v : null)),
  contract_url: z.string().trim().url().or(z.literal("")).nullable().optional()
    .transform((v) => (v ? v : null)),
  contract_end_at: z.string().nullable().optional().transform((v) => (v ? v : null)),
  renewal_window_days: z.coerce.number().int().min(0).max(3650).default(60),
  internal_owner_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type VendorWriteInput = z.infer<typeof writeSchema>;

async function loadOwners(supabase: any, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, { id: string; full_name: string | null; email: string }>();
  const { data, error } = await supabase.from("users").select("id, full_name, email").in("id", unique);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((u: any) => [u.id, u] as const));
}

async function loadSystemCounts(supabase: any, vendorIds: string[]) {
  const map = new Map<string, number>();
  if (vendorIds.length === 0) return map;
  const { data, error } = await supabase
    .from("systems")
    .select("vendor_id")
    .in("vendor_id", vendorIds)
    .is("archived_at", null);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const id = (row as any).vendor_id;
    if (id) map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export const listVendors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      search: z.string().optional(),
      status: z.enum(VENDOR_STATUSES).optional(),
      includeArchived: z.boolean().default(false),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<VendorRow[]> => {
    const { supabase } = context;
    let q = supabase.from("vendors").select("*").order("name", { ascending: true });
    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.status) q = q.eq("status", data.status);
    if (data.search?.trim()) q = q.ilike("name", `%${data.search.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ownerIds = (rows ?? []).map((r: any) => r.internal_owner_id).filter(Boolean) as string[];
    const owners = await loadOwners(supabase, ownerIds);
    const counts = await loadSystemCounts(supabase, (rows ?? []).map((r: any) => r.id));
    return (rows ?? []).map((r: any) => ({
      ...r,
      internal_owner: r.internal_owner_id ? (owners.get(r.internal_owner_id) as any) ?? null : null,
      linked_systems_count: counts.get(r.id) ?? 0,
    }));
  });

export const getVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<VendorRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("vendors").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const owners = await loadOwners(supabase, [row.internal_owner_id].filter(Boolean) as string[]);
    const counts = await loadSystemCounts(supabase, [row.id]);
    return attachActors(supabase, {
      ...row,
      internal_owner: row.internal_owner_id ? (owners.get(row.internal_owner_id) as any) ?? null : null,
      linked_systems_count: counts.get(row.id) ?? 0,
    }) as any;
  });

export const createVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => writeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("vendors")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "vendor.create",
      _entity_type: "vendors",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updateVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: writeSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("vendors").select("*").eq("id", data.id).single();
    if (prevErr) throw new Error(prevErr.message);

    const { data: next, error } = await supabase
      .from("vendors").update(data.patch).eq("id", data.id).select("*").single();
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
        _action: "vendor.update",
        _entity_type: "vendors",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }
    return next;
  });

export const archiveVendor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
    if (adminErr) throw new Error(adminErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const archived_at = data.archive ? new Date().toISOString() : null;
    const { error } = await supabase.from("vendors").update({ archived_at }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: data.archive ? "vendor.archive" : "vendor.unarchive",
      _entity_type: "vendors",
      _entity_id: data.id,
      _before: null,
      _after: { archived_at },
    });
    return { ok: true as const };
  });

export const listVendorSystems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ vendorId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("systems")
      .select("id, name, category, criticality, archived_at")
      .eq("vendor_id", data.vendorId)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listVendorHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("v_vendor_health")
      .select("*")
      .order("contract_end_at", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
