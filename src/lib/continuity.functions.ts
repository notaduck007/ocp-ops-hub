import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type UserLite = { id: string; full_name: string | null; email: string };
type SystemLite = { id: string; name: string };
type RunbookLite = { id: string; title: string };

export type ContinuityScenarioRow =
  Database["public"]["Tables"]["continuity_scenarios"]["Row"] & {
    decision_authority: UserLite | null;
    linked_systems: SystemLite[];
    linked_runbooks: RunbookLite[];
  };

async function decorate(supabase: any, rows: any[]): Promise<ContinuityScenarioRow[]> {
  const userIds = rows.map((r) => r.decision_authority_user_id).filter(Boolean);
  const sysIds = Array.from(new Set(rows.flatMap((r) => r.linked_system_ids ?? [])));
  const rbIds = Array.from(new Set(rows.flatMap((r) => r.linked_runbook_ids ?? [])));

  const [usersRes, sysRes, rbRes] = await Promise.all([
    userIds.length
      ? supabase.from("users").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
    sysIds.length
      ? supabase.from("systems").select("id, name").in("id", sysIds)
      : Promise.resolve({ data: [] }),
    rbIds.length
      ? supabase.from("runbooks").select("id, title").in("id", rbIds)
      : Promise.resolve({ data: [] }),
  ]);

  const users = new Map<string, UserLite>(
    (usersRes.data ?? []).map((u: UserLite) => [u.id, u]),
  );
  const sysMap = new Map<string, SystemLite>(
    (sysRes.data ?? []).map((s: SystemLite) => [s.id, s]),
  );
  const rbMap = new Map<string, RunbookLite>(
    (rbRes.data ?? []).map((r: RunbookLite) => [r.id, r]),
  );

  return rows.map((r) => ({
    ...r,
    decision_authority: r.decision_authority_user_id
      ? users.get(r.decision_authority_user_id) ?? null
      : null,
    linked_systems: (r.linked_system_ids ?? [])
      .map((id: string) => sysMap.get(id))
      .filter(Boolean) as SystemLite[],
    linked_runbooks: (r.linked_runbook_ids ?? [])
      .map((id: string) => rbMap.get(id))
      .filter(Boolean) as RunbookLite[],
  }));
}

export const listContinuityScenarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContinuityScenarioRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("continuity_scenarios")
      .select("*")
      .is("archived_at", null)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return decorate(supabase, data ?? []);
  });

export const getContinuityScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<ContinuityScenarioRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("continuity_scenarios")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const decorated = await decorate(supabase, [row]);
    return decorated[0] ?? null;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  trigger_summary: z.string().max(5000).nullable().optional(),
  impact_summary: z.string().max(5000).nullable().optional(),
  decision_authority_user_id: z.string().uuid(),
  comms_template_md: z.string().max(20_000).nullable().optional(),
  linked_system_ids: z.array(z.string().uuid()).default([]),
  linked_runbook_ids: z.array(z.string().uuid()).default([]),
});

export const upsertContinuityScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => upsertSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { id, ...patch } = data;
      const { data: row, error } = await supabase
        .from("continuity_scenarios")
        .update({ ...patch, updated_by: userId })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("continuity_scenarios")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
