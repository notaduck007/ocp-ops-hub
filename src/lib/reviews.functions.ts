import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type UserLite = { id: string; full_name: string | null; email: string };

export type CampaignRow = Database["public"]["Tables"]["access_review_campaigns"]["Row"] & {
  owner: UserLite | null;
  total_items: number;
  decided_items: number;
};

export type ReviewItemRow = Database["public"]["Tables"]["access_review_items"]["Row"] & {
  grant: {
    id: string;
    role_level: string;
    is_admin: boolean;
    last_used_at: string | null;
    last_reviewed_at: string | null;
    person: { id: string; full_name: string } | null;
    system: { id: string; name: string } | null;
  } | null;
  reviewer: UserLite | null;
};

async function loadUsers(supabase: any, ids: string[]) {
  const u = Array.from(new Set(ids.filter(Boolean)));
  if (!u.length) return new Map<string, UserLite>();
  const { data } = await supabase.from("users").select("id,full_name,email").in("id", u);
  return new Map<string, UserLite>((data ?? []).map((r: UserLite) => [r.id, r]));
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CampaignRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("access_review_campaigns")
      .select("*")
      .is("archived_at", null)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    const counts = new Map<string, { total: number; decided: number }>();
    if (ids.length) {
      const { data: items } = await supabase
        .from("access_review_items")
        .select("campaign_id,decision")
        .in("campaign_id", ids);
      for (const it of items ?? []) {
        const c = counts.get(it.campaign_id) ?? { total: 0, decided: 0 };
        c.total++;
        if (it.decision) c.decided++;
        counts.set(it.campaign_id, c);
      }
    }
    const users = await loadUsers(supabase, (rows ?? []).map((r: any) => r.owner_id));
    return (rows ?? []).map((r: any) => {
      const c = counts.get(r.id) ?? { total: 0, decided: 0 };
      return {
        ...r,
        owner: users.get(r.owner_id) ?? null,
        total_items: c.total,
        decided_items: c.decided,
      };
    });
  });

export const getCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<CampaignRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("access_review_campaigns")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { data: items } = await supabase
      .from("access_review_items")
      .select("decision")
      .eq("campaign_id", row.id);
    const total = items?.length ?? 0;
    const decided = (items ?? []).filter((i: any) => i.decision).length;
    const users = await loadUsers(supabase, [row.owner_id]);
    return { ...row, owner: users.get(row.owner_id) ?? null, total_items: total, decided_items: decided };
  });

export const listCampaignItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ campaignId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<ReviewItemRow[]> => {
    const { supabase } = context;
    const { data: items, error } = await supabase
      .from("access_review_items")
      .select("*")
      .eq("campaign_id", data.campaignId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const grantIds = (items ?? []).map((i: any) => i.grant_id);
    const grants = new Map<string, any>();
    if (grantIds.length) {
      const { data: gs } = await supabase
        .from("access_grants")
        .select("id, role_level, is_admin, last_used_at, last_reviewed_at, person_id, system_id")
        .in("id", grantIds);
      const personIds = (gs ?? []).map((g: any) => g.person_id);
      const sysIds = (gs ?? []).map((g: any) => g.system_id);
      const [{ data: people }, { data: systems }] = await Promise.all([
        supabase.from("people").select("id, full_name").in("id", personIds),
        supabase.from("systems").select("id, name").in("id", sysIds),
      ]);
      const peopleMap = new Map((people ?? []).map((p: any) => [p.id, p]));
      const sysMap = new Map((systems ?? []).map((s: any) => [s.id, s]));
      for (const g of gs ?? []) {
        grants.set(g.id, {
          id: g.id,
          role_level: g.role_level,
          is_admin: g.is_admin,
          last_used_at: g.last_used_at,
          last_reviewed_at: g.last_reviewed_at,
          person: peopleMap.get(g.person_id) ?? null,
          system: sysMap.get(g.system_id) ?? null,
        });
      }
    }
    const reviewerIds = (items ?? []).map((i: any) => i.reviewer_id).filter(Boolean) as string[];
    const reviewers = await loadUsers(supabase, reviewerIds);
    return (items ?? []).map((i: any) => ({
      ...i,
      grant: grants.get(i.grant_id) ?? null,
      reviewer: i.reviewer_id ? reviewers.get(i.reviewer_id) ?? null : null,
    }));
  });

export const previewCampaignScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ system_ids: z.array(z.string().uuid()) }).parse(i))
  .handler(async ({ data, context }): Promise<{ count: number }> => {
    const { supabase } = context;
    let q = supabase.from("access_grants").select("id", { count: "exact", head: true }).is("archived_at", null);
    if (data.system_ids.length) q = q.in("system_id", data.system_ids);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  scope_system_ids: z.array(z.string().uuid()).default([]),
  due_at: z.string(),
  notes: z.string().nullable().optional(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createCampaignSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let gq = supabase.from("access_grants").select("id").is("archived_at", null);
    if (data.scope_system_ids.length) gq = gq.in("system_id", data.scope_system_ids);
    const { data: grants, error: gErr } = await gq;
    if (gErr) throw new Error(gErr.message);

    const { data: campaign, error } = await supabase
      .from("access_review_campaigns")
      .insert({
        name: data.name,
        scope_system_ids: data.scope_system_ids,
        due_at: data.due_at,
        owner_id: userId,
        notes: data.notes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (grants && grants.length) {
      const { error: iErr } = await supabase.from("access_review_items").insert(
        grants.map((g: any) => ({
          campaign_id: campaign.id,
          grant_id: g.id,
          created_by: userId,
          updated_by: userId,
        })),
      );
      if (iErr) throw new Error(iErr.message);
    }

    // Recurring task for periodic re-review
    const nextDue = new Date(data.due_at).toISOString();
    await supabase.from("recurring_tasks").insert({
      kind: "access_review",
      target_type: "campaign",
      target_id: campaign.id,
      cadence_days: 90,
      next_due_at: nextDue,
      owner_id: userId,
      created_by: userId,
      updated_by: userId,
    });

    await supabase.rpc("log_audit", {
      _action: "access_review.create",
      _entity_type: "access_review_campaigns",
      _entity_id: campaign.id,
      _before: null,
      _after: { items: grants?.length ?? 0 },
    });

    return { id: campaign.id, items: grants?.length ?? 0 };
  });

export const decideItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        item_id: z.string().uuid(),
        decision: z.enum(["keep", "revoke", "reduce", "investigate"]),
        notes: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("access_review_items")
      .update({
        decision: data.decision,
        notes: data.notes ?? null,
        reviewer_id: userId,
        decided_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", data.item_id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const completeCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: items, error: iErr } = await supabase
      .from("access_review_items")
      .select("id,decision,grant_id")
      .eq("campaign_id", data.id);
    if (iErr) throw new Error(iErr.message);
    const undecided = (items ?? []).filter((i: any) => !i.decision);
    if (undecided.length) throw new Error(`${undecided.length} item(s) still undecided.`);

    const today = new Date();
    const { error } = await supabase
      .from("access_review_campaigns")
      .update({ completed_at: today.toISOString().slice(0, 10), updated_by: userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Stamp last_reviewed_at on every grant
    const grantIds = (items ?? []).map((i: any) => i.grant_id);
    if (grantIds.length) {
      await supabase
        .from("access_grants")
        .update({ last_reviewed_at: today.toISOString(), updated_by: userId })
        .in("id", grantIds);
    }

    // Update recurring_task: mark completed, set next_due_at = now + cadence
    const { data: task } = await supabase
      .from("recurring_tasks")
      .select("id, cadence_days")
      .eq("target_type", "campaign")
      .eq("target_id", data.id)
      .maybeSingle();
    if (task) {
      const next = new Date(Date.now() + task.cadence_days * 86400_000).toISOString();
      await supabase
        .from("recurring_tasks")
        .update({
          last_completed_at: today.toISOString(),
          next_due_at: next,
          updated_by: userId,
        })
        .eq("id", task.id);
    }

    await supabase.rpc("log_audit", {
      _action: "access_review.complete",
      _entity_type: "access_review_campaigns",
      _entity_id: data.id,
      _before: null,
      _after: null,
    });

    return { ok: true };
  });
