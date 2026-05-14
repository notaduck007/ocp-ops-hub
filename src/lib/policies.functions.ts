import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { attachActors } from "@/lib/load-actors";

export type PolicyStatus = Database["public"]["Enums"]["policy_status"];
export const POLICY_STATUSES = ["draft", "approved", "retired"] as const satisfies readonly PolicyStatus[];

type UserLite = { id: string; full_name: string | null; email: string };

export type PolicyRow = Database["public"]["Tables"]["policies"]["Row"] & {
  owner: UserLite | null;
  approver: UserLite | null;
};

export type PolicyVersionRow = Database["public"]["Tables"]["policy_versions"]["Row"] & {
  approver: UserLite | null;
};

async function loadUsers(supabase: any, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, UserLite>();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", unique);
  if (error) throw new Error(error.message);
  return new Map<string, UserLite>((data ?? []).map((u: UserLite) => [u.id, u] as const));
}

async function decoratePolicies(supabase: any, rows: any[]): Promise<PolicyRow[]> {
  const userIds = [...rows.map((r) => r.owner_id), ...rows.map((r) => r.approved_by)].filter(Boolean) as string[];
  const users = await loadUsers(supabase, userIds);
  return rows.map((r) => ({
    ...r,
    owner: r.owner_id ? users.get(r.owner_id) ?? null : null,
    approver: r.approved_by ? users.get(r.approved_by) ?? null : null,
  }));
}

export const listPolicies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ includeRetired: z.boolean().default(false) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<PolicyRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("policies")
      .select("*")
      .is("archived_at", null)
      .order("title", { ascending: true });
    if (!data.includeRetired) q = q.neq("status", "retired");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return decoratePolicies(supabase, rows ?? []);
  });

export const getPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<PolicyRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("policies")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const decorated = await decoratePolicies(supabase, [row]);
    const first = decorated[0];
    return first ? ((await attachActors(supabase, first)) as any) : null;
  });

export const listPolicyVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ policyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PolicyVersionRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("policy_versions")
      .select("*")
      .eq("policy_id", data.policyId)
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    const userIds = (rows ?? []).map((r: any) => r.approved_by).filter(Boolean) as string[];
    const users = await loadUsers(supabase, userIds);
    return (rows ?? []).map((r: any) => ({
      ...r,
      approver: r.approved_by ? users.get(r.approved_by) ?? null : null,
    }));
  });

const createPolicySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body_md: z.string().trim().min(1).max(50_000),
  owner_id: z.string().uuid(),
  review_cadence_days: z.number().int().min(1).max(3650).default(365),
});

export const createPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createPolicySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("policies")
      .insert({
        title: data.title,
        body_md: data.body_md,
        version: 1,
        status: "draft" as PolicyStatus,
        owner_id: data.owner_id,
        review_cadence_days: data.review_cadence_days,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { error: vErr } = await supabase.from("policy_versions").insert({
      policy_id: row.id,
      version: 1,
      body_md: data.body_md,
      status: "draft" as PolicyStatus,
      created_by: userId,
      updated_by: userId,
    });
    if (vErr) throw new Error(vErr.message);

    await supabase.rpc("log_audit", {
      _action: "policy.create",
      _entity_type: "policies",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

const updateMetaSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    owner_id: z.string().uuid().optional(),
    review_cadence_days: z.number().int().min(1).max(3650).optional(),
    next_review_due_at: z.string().nullable().optional(),
  }),
});

export const updatePolicyMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateMetaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("policies")
      .update({ ...data.patch, updated_by: userId })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Editor creates a new draft version (or updates the current pending draft)
const draftVersionSchema = z.object({
  policy_id: z.string().uuid(),
  body_md: z.string().trim().min(1).max(50_000),
});

export const createDraftVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => draftVersionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: policy, error: pErr } = await supabase
      .from("policies")
      .select("id, version, status")
      .eq("id", data.policy_id)
      .single();
    if (pErr) throw new Error(pErr.message);

    // If there's already a draft version > current approved version, update it
    const { data: existingDraft } = await supabase
      .from("policy_versions")
      .select("id, version")
      .eq("policy_id", data.policy_id)
      .eq("status", "draft")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // For brand new policies (status=draft, v1), reuse the v1 row
    if (policy.status === "draft" && existingDraft) {
      const { error } = await supabase
        .from("policy_versions")
        .update({ body_md: data.body_md, updated_by: userId })
        .eq("id", existingDraft.id);
      if (error) throw new Error(error.message);
      await supabase
        .from("policies")
        .update({ body_md: data.body_md, updated_by: userId })
        .eq("id", data.policy_id);
      return { id: existingDraft.id, version: existingDraft.version };
    }

    // For approved policies, create next draft version
    const nextVersion = policy.version + (existingDraft ? 0 : 1);
    if (existingDraft && existingDraft.version > policy.version) {
      const { error } = await supabase
        .from("policy_versions")
        .update({ body_md: data.body_md, updated_by: userId })
        .eq("id", existingDraft.id);
      if (error) throw new Error(error.message);
      return { id: existingDraft.id, version: existingDraft.version };
    }

    const { data: row, error } = await supabase
      .from("policy_versions")
      .insert({
        policy_id: data.policy_id,
        version: nextVersion,
        body_md: data.body_md,
        status: "draft" as PolicyStatus,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "policy.draft",
      _entity_type: "policies",
      _entity_id: data.policy_id,
      _before: null,
      _after: { version: nextVersion },
    });
    return row;
  });

// Admin approves a draft version → promote to current
export const approveVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ version_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: ver, error: vErr } = await supabase
      .from("policy_versions")
      .select("*")
      .eq("id", data.version_id)
      .single();
    if (vErr) throw new Error(vErr.message);
    if (ver.status !== "draft") throw new Error("Version is not a draft.");

    const now = new Date().toISOString();

    const { error: updVerErr } = await supabase
      .from("policy_versions")
      .update({
        status: "approved" as PolicyStatus,
        approved_at: now,
        approved_by: userId,
        updated_by: userId,
      })
      .eq("id", data.version_id);
    if (updVerErr) throw new Error(updVerErr.message);

    // Bump policy review due based on cadence
    const { data: policy } = await supabase
      .from("policies")
      .select("review_cadence_days")
      .eq("id", ver.policy_id)
      .single();
    const reviewDue = policy
      ? new Date(Date.now() + policy.review_cadence_days * 86400_000)
          .toISOString()
          .slice(0, 10)
      : null;

    const { data: updatedPolicy, error: updPolErr } = await supabase
      .from("policies")
      .update({
        body_md: ver.body_md,
        version: ver.version,
        status: "approved" as PolicyStatus,
        approved_at: now,
        approved_by: userId,
        next_review_due_at: reviewDue,
        updated_by: userId,
      })
      .eq("id", ver.policy_id)
      .select("*")
      .single();
    if (updPolErr) throw new Error(updPolErr.message);

    await supabase.rpc("log_audit", {
      _action: "policy.approve",
      _entity_type: "policies",
      _entity_id: ver.policy_id,
      _before: null,
      _after: { version: ver.version },
    });

    return updatedPolicy;
  });

export const retirePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("policies")
      .update({ status: "retired" as PolicyStatus, updated_by: userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "policy.retire",
      _entity_type: "policies",
      _entity_id: data.id,
      _before: null,
      _after: null,
    });
    return { ok: true };
  });
