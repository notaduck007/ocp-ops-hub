import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AttentionItem = {
  kind: string;
  id: string;
  label: string;
  sublabel?: string | null;
  due_at: string | null;
  owner_id: string | null;
  owner_name: string | null;
  severity?: number | null;
};

const listAttentionInput = z.object({
  limit: z.number().int().min(1).max(1000).optional(),
  kind: z.string().optional(),
  ownerScope: z.enum(["all", "me"]).optional(),
});

export const listAttention = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    i === undefined ? {} : listAttentionInput.parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("v_overdue_reviews" as any)
      .select("kind,id,label,due_at,owner_id")
      .order("due_at", { ascending: true });
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.ownerScope === "me") q = q.eq("owner_id", userId);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as Array<{
      kind: string;
      id: string;
      label: string;
      due_at: string | null;
      owner_id: string | null;
    }>;
    const ownerIds = Array.from(
      new Set(list.map((r) => r.owner_id).filter((v): v is string => !!v)),
    );
    const owners: Record<string, string> = {};
    if (ownerIds.length) {
      const { data: people } = await supabase
        .from("people")
        .select("id,full_name")
        .in("id", ownerIds);
      for (const p of people ?? []) owners[p.id] = p.full_name;
      const { data: users } = await supabase
        .from("users")
        .select("id,full_name,email")
        .in("id", ownerIds);
      for (const u of users ?? [])
        if (!owners[u.id]) owners[u.id] = u.full_name ?? u.email;
    }
    const items: AttentionItem[] = list.map((r) => ({
      ...r,
      owner_name: r.owner_id ? owners[r.owner_id] ?? null : null,
    }));
    return { count: items.length, items };
  });

export const getOpenCriticalRisks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("v_open_critical_risks" as any)
      .select("id,title,severity,score")
      .order("score", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      title: string;
      severity: number;
      score: number;
    }>;
    return { count: rows.length, top: rows.slice(0, 3) };
  });

export const getOverdueReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("v_overdue_reviews" as any)
      .select("kind,id,label,due_at,owner_id")
      .order("due_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Array<{
      kind: string;
      id: string;
      label: string;
      due_at: string | null;
      owner_id: string | null;
    }>;

    // Resolve owner names for items that have an owner_id
    const ownerIds = Array.from(
      new Set(rows.map((r) => r.owner_id).filter((v): v is string => !!v))
    );
    const owners: Record<string, string> = {};
    if (ownerIds.length) {
      const { data: people } = await supabase
        .from("people")
        .select("id,full_name")
        .in("id", ownerIds);
      for (const p of people ?? []) owners[p.id] = p.full_name;
      const { data: users } = await supabase
        .from("users")
        .select("id,full_name,email")
        .in("id", ownerIds);
      for (const u of users ?? [])
        if (!owners[u.id]) owners[u.id] = u.full_name ?? u.email;
    }

    return {
      count: rows.length,
      items: rows.slice(0, 10).map((r) => ({
        ...r,
        owner_name: r.owner_id ? owners[r.owner_id] ?? null : null,
      })),
    };
  });

export const getIncidentsThisQuarter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Placeholder until incidents module ships
    return {
      total: 0,
      by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
    };
  });

export const getDrReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("v_dr_readiness" as any)
      .select("critical_systems_total, critical_systems_tested_recently, pct")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? null) as
      | { critical_systems_total: number; critical_systems_tested_recently: number; pct: number | null }
      | null;
    return {
      critical_systems: row?.critical_systems_total ?? 0,
      tested_last_12mo: row?.critical_systems_tested_recently ?? 0,
      readiness_pct: Number(row?.pct ?? 0),
    };
  });

export const getVendorHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("v_vendor_health" as any)
      .select("vendor_id,name,contract_ending_soon,open_breaches_90d");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Array<{
      vendor_id: string;
      name: string;
      contract_ending_soon: boolean;
      open_breaches_90d: number;
    }>;
    const open_breaches = rows.reduce(
      (acc, r) => acc + (r.open_breaches_90d ?? 0),
      0
    );
    const expiring_soon = rows.filter((r) => r.contract_ending_soon).length;
    return { open_breaches, expiring_soon };
  });
