import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const range = (input: { from: string; to: string }) => ({
  from: String(input.from),
  to: String(input.to),
});

export const getGovernanceReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(range)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { from, to } = data;

    const [risks, incidents, changes, policies, reviews] = await Promise.all([
      supabase.from("risks").select("id,title,status,severity,score,updated_at")
        .in("status", ["accepted", "closed"]).gte("updated_at", from).lte("updated_at", to),
      supabase.from("incidents").select("id,title,severity,status,declared_at")
        .gte("declared_at", from).lte("declared_at", to),
      supabase.from("changes").select("id,title,class,status,completed_at")
        .eq("status", "completed").gte("completed_at", from).lte("completed_at", to),
      supabase.from("policies").select("id,title,status,version,updated_at")
        .in("status", ["approved", "retired"]).gte("updated_at", from).lte("updated_at", to),
      supabase.from("access_review_campaigns").select("id,name,completed_at,due_at")
        .not("completed_at", "is", null).gte("completed_at", from).lte("completed_at", to),
    ]);

    const incRows = incidents.data ?? [];
    const bySeverity = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;
    for (const i of incRows) bySeverity[i.severity as number] = (bySeverity[i.severity as number] ?? 0) + 1;

    return {
      risks: risks.data ?? [],
      incidents: incRows,
      incidents_by_severity: bySeverity,
      changes: changes.data ?? [],
      policies: policies.data ?? [],
      reviews: reviews.data ?? [],
    };
  });

export const getMfaCoverageReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: systems }, { data: grants }, { data: people }] = await Promise.all([
      supabase.from("systems").select("id,name,mfa_required,criticality").is("archived_at", null),
      supabase.from("access_grants").select("id,system_id,person_id").is("archived_at", null),
      supabase.from("people").select("id,type").is("archived_at", null),
    ]);
    const peopleById = new Map((people ?? []).map((p) => [p.id, p]));
    const perSystem = (systems ?? []).map((s) => {
      const myGrants = (grants ?? []).filter((g) => g.system_id === s.id);
      const types: Record<string, number> = {};
      for (const g of myGrants) {
        const t = peopleById.get(g.person_id)?.type ?? "unknown";
        types[t] = (types[t] ?? 0) + 1;
      }
      return {
        system_id: s.id,
        system: s.name,
        criticality: s.criticality,
        mfa_required: s.mfa_required,
        grants_total: myGrants.length,
        by_type: types,
      };
    });
    return { systems: perSystem };
  });

export const getVendorSlaReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date();
    const in90 = new Date(today.getTime() + 90 * 86_400_000).toISOString().slice(0, 10);
    const in180 = new Date(today.getTime() + 180 * 86_400_000).toISOString().slice(0, 10);

    const [{ data: vendors }, { data: breaches }, { data: slas }] = await Promise.all([
      supabase.from("vendors").select("id,name,contract_end_at,status").is("archived_at", null),
      supabase.from("sla_breaches").select("id,sla_id,occurred_at,status,impact_summary").eq("status", "open"),
      supabase.from("slas").select("id,vendor_id,name,target_value,target_type").is("archived_at", null),
    ]);

    const slaByVendor = new Map<string, any[]>();
    for (const s of slas ?? []) {
      const arr = slaByVendor.get(s.vendor_id) ?? [];
      arr.push(s);
      slaByVendor.set(s.vendor_id, arr);
    }
    const vendorRows = (vendors ?? []).map((v) => ({
      ...v,
      expires_within_90d: v.contract_end_at ? v.contract_end_at <= in90 : false,
      expires_within_180d: v.contract_end_at ? v.contract_end_at <= in180 : false,
      sla_count: (slaByVendor.get(v.id) ?? []).length,
    }));
    return { vendors: vendorRows, open_breaches: breaches ?? [] };
  });

export const getDrReadinessReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: systems }, { data: runbooks }, { data: tests }] = await Promise.all([
      supabase.from("systems").select("id,name,criticality,rto_minutes,rpo_minutes").eq("criticality", "critical").is("archived_at", null),
      supabase.from("runbooks").select("id,system_id,title,scenario,last_tested_at,next_test_due_at").is("archived_at", null),
      supabase.from("dr_tests").select("id,runbook_id,result,performed_at").order("performed_at", { ascending: false }),
    ]);
    const rbBySystem = new Map<string, any[]>();
    for (const r of runbooks ?? []) {
      const arr = rbBySystem.get(r.system_id) ?? [];
      arr.push(r);
      rbBySystem.set(r.system_id, arr);
    }
    const lastTestByRunbook = new Map<string, any>();
    for (const t of tests ?? []) {
      if (!lastTestByRunbook.has(t.runbook_id)) lastTestByRunbook.set(t.runbook_id, t);
    }
    const rows = (systems ?? []).map((s) => {
      const rbs = (rbBySystem.get(s.id) ?? []).map((r) => ({
        ...r,
        last_test: lastTestByRunbook.get(r.id) ?? null,
      }));
      return { ...s, runbooks: rbs };
    });
    return { systems: rows };
  });
