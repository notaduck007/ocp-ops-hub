import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SearchHit = {
  kind: "system" | "person" | "vendor" | "risk" | "incident" | "change" | "policy" | "runbook";
  id: string;
  label: string;
  sublabel?: string | null;
};

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q: string }) => ({ q: String(input.q ?? "").slice(0, 100) }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const q = data.q.trim();
    if (!q) return { hits: [] as SearchHit[] };
    const like = `%${q}%`;
    const limit = 8;

    const [systems, people, vendors, risks, incidents, changes, policies, runbooks] =
      await Promise.all([
        supabase.from("systems").select("id,name,category").ilike("name", like).is("archived_at", null).limit(limit),
        supabase.from("people").select("id,full_name,email").or(`full_name.ilike.${like},email.ilike.${like}`).is("archived_at", null).limit(limit),
        supabase.from("vendors").select("id,name").ilike("name", like).is("archived_at", null).limit(limit),
        supabase.from("risks").select("id,title").ilike("title", like).is("archived_at", null).limit(limit),
        supabase.from("incidents").select("id,title,severity").ilike("title", like).is("archived_at", null).limit(limit),
        supabase.from("changes").select("id,title,status").ilike("title", like).is("archived_at", null).limit(limit),
        supabase.from("policies").select("id,title,version").ilike("title", like).is("archived_at", null).limit(limit),
        supabase.from("runbooks").select("id,title,scenario").ilike("title", like).is("archived_at", null).limit(limit),
      ]);

    const hits: SearchHit[] = [
      ...(systems.data ?? []).map((r: any) => ({ kind: "system" as const, id: r.id, label: r.name, sublabel: r.category })),
      ...(people.data ?? []).map((r: any) => ({ kind: "person" as const, id: r.id, label: r.full_name, sublabel: r.email })),
      ...(vendors.data ?? []).map((r: any) => ({ kind: "vendor" as const, id: r.id, label: r.name, sublabel: null })),
      ...(risks.data ?? []).map((r: any) => ({ kind: "risk" as const, id: r.id, label: r.title, sublabel: null })),
      ...(incidents.data ?? []).map((r: any) => ({ kind: "incident" as const, id: r.id, label: r.title, sublabel: `Sev ${r.severity}` })),
      ...(changes.data ?? []).map((r: any) => ({ kind: "change" as const, id: r.id, label: r.title, sublabel: r.status })),
      ...(policies.data ?? []).map((r: any) => ({ kind: "policy" as const, id: r.id, label: r.title, sublabel: `v${r.version}` })),
      ...(runbooks.data ?? []).map((r: any) => ({ kind: "runbook" as const, id: r.id, label: r.title, sublabel: r.scenario })),
    ];
    return { hits };
  });
