import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DrPlanData = {
  generated_at: string;
  critical_systems: Array<{
    id: string;
    name: string;
    criticality: string;
    rto_minutes: number | null;
    rpo_minutes: number | null;
  }>;
  restore_runbooks: Array<{
    id: string;
    title: string;
    body_md: string;
    system_name: string;
    last_tested_at: string | null;
    owner_name: string | null;
  }>;
  continuity_scenarios: Array<{
    id: string;
    name: string;
    trigger_summary: string | null;
    impact_summary: string | null;
    decision_authority_name: string | null;
    comms_template_md: string | null;
  }>;
  recent_tests: Array<{
    id: string;
    runbook_title: string;
    system_name: string;
    performed_at: string;
    result: DrTestResult;
    performed_by_name: string | null;
    notes_md: string | null;
  }>;
};

export const getDrPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DrPlanData> => {
    const { supabase } = context;

    const { data: critRaw } = await supabase
      .from("systems")
      .select("id, name, criticality, rto_minutes, rpo_minutes")
      .is("archived_at", null)
      .in("criticality", ["high", "critical"])
      .order("name");
    const critical = (critRaw ?? []) as any[];
    const critIds = critical.map((c) => c.id);

    const { data: rbRaw } = critIds.length
      ? await supabase
          .from("runbooks")
          .select("id, title, body_md, system_id, owner_id, last_tested_at")
          .is("archived_at", null)
          .eq("scenario", "restore")
          .in("system_id", critIds)
          .order("title")
      : { data: [] as any[] };
    const runbooks = (rbRaw ?? []) as any[];

    const userIds = Array.from(new Set(runbooks.map((r) => r.owner_id).filter(Boolean)));
    const sysMap = new Map<string, string>(critical.map((s) => [s.id, s.name]));

    const { data: csRaw } = await supabase
      .from("continuity_scenarios")
      .select("id, name, trigger_summary, impact_summary, decision_authority_user_id, comms_template_md")
      .is("archived_at", null)
      .order("name");
    const cs = (csRaw ?? []) as any[];
    const csUserIds = cs.map((c) => c.decision_authority_user_id).filter(Boolean);

    const since = new Date(Date.now() - 365 * 86400_000).toISOString();
    const { data: testsRaw } = await supabase
      .from("dr_tests")
      .select("id, runbook_id, performed_at, result, notes_md, performed_by_id")
      .gte("performed_at", since)
      .order("performed_at", { ascending: false })
      .limit(200);
    const tests = (testsRaw ?? []) as any[];

    const allRbIds = Array.from(new Set([...runbooks.map((r) => r.id), ...tests.map((t) => t.runbook_id)]));
    const { data: allRbsRaw } = allRbIds.length
      ? await supabase
          .from("runbooks")
          .select("id, title, system_id")
          .in("id", allRbIds)
      : { data: [] as any[] };
    const allRbMap = new Map<string, { title: string; system_id: string }>(
      ((allRbsRaw ?? []) as any[]).map((r) => [r.id, { title: r.title, system_id: r.system_id }]),
    );

    const allSysIds = Array.from(
      new Set(((allRbsRaw ?? []) as any[]).map((r) => r.system_id).filter(Boolean)),
    );
    const { data: allSysRaw } = allSysIds.length
      ? await supabase.from("systems").select("id, name").in("id", allSysIds)
      : { data: [] as any[] };
    for (const s of (allSysRaw ?? []) as any[]) sysMap.set(s.id, s.name);

    const allUserIds = Array.from(
      new Set([
        ...userIds,
        ...csUserIds,
        ...tests.map((t) => t.performed_by_id).filter(Boolean),
      ]),
    );
    const { data: usersRaw } = allUserIds.length
      ? await supabase.from("users").select("id, full_name, email").in("id", allUserIds)
      : { data: [] as any[] };
    const userMap = new Map<string, string>(
      ((usersRaw ?? []) as any[]).map((u) => [u.id, u.full_name ?? u.email]),
    );

    return {
      generated_at: new Date().toISOString(),
      critical_systems: critical.map((s) => ({
        id: s.id,
        name: s.name,
        criticality: s.criticality,
        rto_minutes: s.rto_minutes,
        rpo_minutes: s.rpo_minutes,
      })),
      restore_runbooks: runbooks.map((r) => ({
        id: r.id,
        title: r.title,
        body_md: r.body_md,
        system_name: sysMap.get(r.system_id) ?? "—",
        last_tested_at: r.last_tested_at,
        owner_name: r.owner_id ? userMap.get(r.owner_id) ?? null : null,
      })),
      continuity_scenarios: cs.map((c) => ({
        id: c.id,
        name: c.name,
        trigger_summary: c.trigger_summary,
        impact_summary: c.impact_summary,
        decision_authority_name: c.decision_authority_user_id
          ? userMap.get(c.decision_authority_user_id) ?? null
          : null,
        comms_template_md: c.comms_template_md,
      })),
      recent_tests: tests.map((t) => {
        const rb = allRbMap.get(t.runbook_id);
        return {
          id: t.id,
          runbook_title: rb?.title ?? "—",
          system_name: rb ? sysMap.get(rb.system_id) ?? "—" : "—",
          performed_at: t.performed_at,
          result: t.result,
          performed_by_name: t.performed_by_id ? userMap.get(t.performed_by_id) ?? null : null,
          notes_md: t.notes_md,
        };
      }),
    };
  });
