import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ListInput = z.object({
  actor_id: z.string().uuid().nullable().optional(),
  entity_type: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(200).default(50),
});

export const listAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("audit_log")
      .select(
        "*, actor:users!audit_log_actor_id_fkey(id,email,full_name)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (data.actor_id) q = q.eq("actor_id", data.actor_id);
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    if (data.action) q = q.ilike("action", `%${data.action}%`);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);

    const start = data.page * data.pageSize;
    const { data: rows, error, count } = await q.range(
      start,
      start + data.pageSize - 1,
    );
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const listAuditFilters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [users, entities] = await Promise.all([
      supabase.from("users").select("id,email,full_name").order("email"),
      supabase.from("audit_log").select("entity_type").limit(1000),
    ]);
    const entitySet = Array.from(
      new Set((entities.data ?? []).map((r) => r.entity_type)),
    ).sort();
    return { users: users.data ?? [], entityTypes: entitySet };
  });
