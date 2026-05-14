import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type RunbookScenario = Database["public"]["Enums"]["runbook_scenario"];
export const RUNBOOK_SCENARIOS = [
  "restore",
  "outage",
  "failover",
  "continuity",
  "offboarding",
] as const satisfies readonly RunbookScenario[];

export type DrTestResult = Database["public"]["Enums"]["dr_test_result"];
export const DR_TEST_RESULTS = ["pass", "partial", "fail"] as const satisfies readonly DrTestResult[];

type UserLite = { id: string; full_name: string | null; email: string };
type SystemLite = { id: string; name: string; criticality: string };

export type RunbookRow = Database["public"]["Tables"]["runbooks"]["Row"] & {
  owner: UserLite | null;
  system: SystemLite | null;
};

export type DrTestRow = Database["public"]["Tables"]["dr_tests"]["Row"] & {
  performed_by: UserLite | null;
};

async function loadUsers(supabase: any, ids: string[]) {
  const u = Array.from(new Set(ids.filter(Boolean)));
  if (!u.length) return new Map<string, UserLite>();
  const { data } = await supabase.from("users").select("id, full_name, email").in("id", u);
  return new Map<string, UserLite>((data ?? []).map((x: UserLite) => [x.id, x]));
}

async function loadSystems(supabase: any, ids: string[]) {
  const u = Array.from(new Set(ids.filter(Boolean)));
  if (!u.length) return new Map<string, SystemLite>();
  const { data } = await supabase
    .from("systems")
    .select("id, name, criticality")
    .in("id", u);
  return new Map<string, SystemLite>((data ?? []).map((x: SystemLite) => [x.id, x]));
}

export const listRunbooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        systemId: z.string().uuid().optional(),
        scenario: z.enum(RUNBOOK_SCENARIOS).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<RunbookRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("runbooks")
      .select("*")
      .is("archived_at", null)
      .order("title", { ascending: true });
    if (data.systemId) q = q.eq("system_id", data.systemId);
    if (data.scenario) q = q.eq("scenario", data.scenario);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    const users = await loadUsers(supabase, list.map((r) => r.owner_id));
    const systems = await loadSystems(supabase, list.map((r) => r.system_id));
    return list.map((r) => ({
      ...r,
      owner: users.get(r.owner_id) ?? null,
      system: systems.get(r.system_id) ?? null,
    }));
  });

export const getRunbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<RunbookRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("runbooks")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const users = await loadUsers(supabase, [row.owner_id]);
    const systems = await loadSystems(supabase, [row.system_id]);
    return {
      ...row,
      owner: users.get(row.owner_id) ?? null,
      system: systems.get(row.system_id) ?? null,
    };
  });

const createSchema = z.object({
  system_id: z.string().uuid(),
  scenario: z.enum(RUNBOOK_SCENARIOS),
  title: z.string().trim().min(1).max(200),
  body_md: z.string().trim().min(1).max(50_000),
  owner_id: z.string().uuid(),
  test_cadence_days: z.number().int().min(1).max(3650).default(365),
});

export const createRunbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("runbooks")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "runbook.create",
      _entity_type: "runbooks",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    body_md: z.string().trim().min(1).max(50_000).optional(),
    owner_id: z.string().uuid().optional(),
    test_cadence_days: z.number().int().min(1).max(3650).optional(),
    scenario: z.enum(RUNBOOK_SCENARIOS).optional(),
  }),
});

export const updateRunbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("runbooks")
      .update({ ...data.patch, updated_by: userId })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listDrTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ runbookId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<DrTestRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("dr_tests")
      .select("*")
      .eq("runbook_id", data.runbookId)
      .order("performed_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    const users = await loadUsers(supabase, list.map((r) => r.performed_by_id));
    return list.map((r) => ({ ...r, performed_by: users.get(r.performed_by_id) ?? null }));
  });

const logTestSchema = z.object({
  runbook_id: z.string().uuid(),
  performed_at: z.string(),
  performed_by_id: z.string().uuid(),
  result: z.enum(DR_TEST_RESULTS),
  duration_minutes: z.number().int().min(0).max(100000).nullable().optional(),
  notes_md: z.string().max(20_000).nullable().optional(),
  remediation_items: z.string().max(20_000).nullable().optional(),
});

export const logDrTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => logTestSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("dr_tests")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "runbook.test_logged",
      _entity_type: "runbooks",
      _entity_id: data.runbook_id,
      _before: null,
      _after: { result: data.result, performed_at: data.performed_at },
    });
    return row;
  });

export const listRunbookActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ runbookId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, created_at, actor_id, after")
      .eq("entity_type", "runbooks")
      .eq("entity_id", data.runbookId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    const users = await loadUsers(supabase, list.map((r) => r.actor_id));
    return list.map((r) => ({ ...r, actor: r.actor_id ? users.get(r.actor_id) ?? null : null }));
  });
