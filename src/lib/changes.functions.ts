import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type UserLite = { id: string; full_name: string | null; email: string };
type SystemLite = { id: string; name: string };
type IncidentLite = { id: string; title: string; status: string };

export type ChangeClass = Database["public"]["Enums"]["change_class"];
export type ChangeStatus = Database["public"]["Enums"]["change_status"];

export const CHANGE_CLASSES = [
  "standard",
  "normal",
  "emergency",
] as const satisfies readonly ChangeClass[];

export const CHANGE_STATUSES = [
  "proposed",
  "approved",
  "rejected",
  "in_flight",
  "completed",
  "rolled_back",
] as const satisfies readonly ChangeStatus[];

export type ChangeRow = Database["public"]["Tables"]["changes"]["Row"] & {
  requester: UserLite | null;
  approver: UserLite | null;
  systems: SystemLite[];
  linked_incident: IncidentLite | null;
};

async function loadUsers(supabase: any, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, UserLite>();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", unique);
  if (error) throw new Error(error.message);
  return new Map<string, UserLite>(
    (data ?? []).map((u: UserLite) => [u.id, u] as const),
  );
}

async function loadSystemsByChange(
  supabase: any,
  changeIds: string[],
): Promise<Map<string, SystemLite[]>> {
  const map = new Map<string, SystemLite[]>();
  if (changeIds.length === 0) return map;
  const { data, error } = await supabase
    .from("change_systems")
    .select("change_id, system_id, systems:systems(id, name)")
    .in("change_id", changeIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const arr = map.get(row.change_id) ?? [];
    if (row.systems) arr.push(row.systems as SystemLite);
    map.set(row.change_id, arr);
  }
  return map;
}

async function loadIncidents(supabase: any, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, IncidentLite>();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, title, status")
    .in("id", unique);
  if (error) throw new Error(error.message);
  return new Map<string, IncidentLite>(
    (data ?? []).map((i: IncidentLite) => [i.id, i] as const),
  );
}

async function decorate(supabase: any, rows: any[]): Promise<ChangeRow[]> {
  const userIds = [
    ...rows.map((r) => r.requested_by),
    ...rows.map((r) => r.approver_id),
  ].filter(Boolean) as string[];
  const incidentIds = rows
    .map((r) => r.linked_incident_id)
    .filter(Boolean) as string[];
  const [users, systems, incidents] = await Promise.all([
    loadUsers(supabase, userIds),
    loadSystemsByChange(supabase, rows.map((r) => r.id)),
    loadIncidents(supabase, incidentIds),
  ]);
  return rows.map((r) => ({
    ...r,
    requester: r.requested_by ? users.get(r.requested_by) ?? null : null,
    approver: r.approver_id ? users.get(r.approver_id) ?? null : null,
    systems: systems.get(r.id) ?? [],
    linked_incident: r.linked_incident_id
      ? incidents.get(r.linked_incident_id) ?? null
      : null,
  }));
}

const proposeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  class: z.enum(CHANGE_CLASSES),
  description: z.string().nullable().optional(),
  risk_summary: z.string().nullable().optional(),
  rollback_plan: z.string().trim().min(1, "Rollback plan is required").max(4000),
  comms_plan: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  system_ids: z.array(z.string().uuid()).default([]),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  class: z.enum(CHANGE_CLASSES).optional(),
  description: z.string().nullable().optional(),
  risk_summary: z.string().nullable().optional(),
  rollback_plan: z.string().trim().min(1).max(4000).optional(),
  comms_plan: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  linked_incident_id: z.string().uuid().nullable().optional(),
});

const transitionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CHANGE_STATUSES),
  rollback_note: z.string().trim().max(4000).nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
});

export const listChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(CHANGE_STATUSES).optional(),
        class: z.enum(CHANGE_CLASSES).optional(),
        systemId: z.string().uuid().optional(),
        includeArchived: z.boolean().default(false),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<ChangeRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("changes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.status) q = q.eq("status", data.status);
    if (data.class) q = q.eq("class", data.class);

    if (data.systemId) {
      const { data: links, error: linkErr } = await supabase
        .from("change_systems")
        .select("change_id")
        .eq("system_id", data.systemId);
      if (linkErr) throw new Error(linkErr.message);
      const ids = (links ?? []).map((l: any) => l.change_id);
      if (ids.length === 0) return [];
      q = q.in("id", ids);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return decorate(supabase, rows ?? []);
  });

export const getChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ChangeRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("changes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const decorated = await decorate(supabase, [row]);
    return decorated[0] ?? null;
  });

export const proposeChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => proposeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const insert = {
      title: data.title,
      class: data.class,
      status: "proposed" as ChangeStatus,
      description: data.description ?? null,
      risk_summary: data.risk_summary ?? null,
      rollback_plan: data.rollback_plan,
      comms_plan: data.comms_plan ?? null,
      scheduled_at: data.scheduled_at ?? null,
      requested_by: userId,
      created_by: userId,
      updated_by: userId,
    };
    const { data: row, error } = await supabase
      .from("changes")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (data.system_ids.length) {
      const { error: linkErr } = await supabase
        .from("change_systems")
        .insert(
          data.system_ids.map((sid) => ({
            change_id: row.id,
            system_id: sid,
          })),
        );
      if (linkErr) throw new Error(linkErr.message);
    }

    await supabase.rpc("log_audit", {
      _action: "change.propose",
      _entity_type: "changes",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updateChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), patch: updateSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("changes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (prevErr) throw new Error(prevErr.message);

    const patch: any = { ...data.patch, updated_by: userId };
    const { data: next, error } = await supabase
      .from("changes")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const before: Record<string, Json> = {};
    const after: Record<string, Json> = {};
    for (const k of Object.keys(data.patch)) {
      if (
        JSON.stringify((prev as any)[k]) !== JSON.stringify((next as any)[k])
      ) {
        before[k] = (prev as any)[k];
        after[k] = (next as any)[k];
      }
    }
    if (Object.keys(after).length > 0) {
      await supabase.rpc("log_audit", {
        _action: "change.update",
        _entity_type: "changes",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }
    return next;
  });

export const transitionChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => transitionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("changes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (prevErr) throw new Error(prevErr.message);

    // Client-side validations (RLS + DB triggers also enforce)
    if (data.status === "in_flight") {
      const scheduled = data.scheduled_at ?? prev.scheduled_at;
      if (!scheduled) {
        throw new Error("Schedule the change before starting it.");
      }
      if (prev.status !== "approved") {
        throw new Error("Change must be approved before it can be started.");
      }
    }
    if (data.status === "completed" && prev.status !== "in_flight") {
      throw new Error("Only in-flight changes can be completed.");
    }
    if (data.status === "rolled_back") {
      const note = data.rollback_note?.trim();
      if (!note) {
        throw new Error("A rollback note is required.");
      }
    }

    const patch: any = { status: data.status, updated_by: userId };
    if (data.scheduled_at !== undefined) patch.scheduled_at = data.scheduled_at;
    if (data.status === "approved") patch.approver_id = userId;
    if (data.status === "rejected") patch.approver_id = userId;
    if (data.status === "rolled_back" && data.rollback_note !== undefined) {
      patch.rollback_note = data.rollback_note;
    }

    const { data: next, error } = await supabase
      .from("changes")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: `change.${data.status}`,
      _entity_type: "changes",
      _entity_id: data.id,
      _before: { status: prev.status },
      _after: {
        status: next.status,
        scheduled_at: next.scheduled_at,
        rollback_note: next.rollback_note,
      },
    });
    return next;
  });

export const setChangeSystems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        change_id: z.string().uuid(),
        system_ids: z.array(z.string().uuid()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: delErr } = await supabase
      .from("change_systems")
      .delete()
      .eq("change_id", data.change_id);
    if (delErr) throw new Error(delErr.message);
    if (data.system_ids.length) {
      const { error } = await supabase.from("change_systems").insert(
        data.system_ids.map((sid) => ({
          change_id: data.change_id,
          system_id: sid,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export type ChangeAuditEntry = {
  id: string;
  action: string;
  before: Json | null;
  after: Json | null;
  created_at: string;
  actor: UserLite | null;
};

export const listChangeAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ changeId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ChangeAuditEntry[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, before, after, created_at, actor_id")
      .eq("entity_type", "changes")
      .eq("entity_id", data.changeId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const actorIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.actor_id).filter(Boolean)),
    ) as string[];
    const actors = await loadUsers(supabase, actorIds);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      action: r.action,
      before: r.before,
      after: r.after,
      created_at: r.created_at,
      actor: r.actor_id ? actors.get(r.actor_id) ?? null : null,
    }));
  });

export const searchOpenIncidents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().max(200).default("") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("incidents")
      .select("id, title, status")
      .is("archived_at", null)
      .order("declared_at", { ascending: false })
      .limit(20);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as IncidentLite[];
  });
