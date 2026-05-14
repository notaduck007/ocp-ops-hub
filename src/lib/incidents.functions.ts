import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { attachActors } from "@/lib/load-actors";

type UserLite = { id: string; full_name: string | null; email: string };
type SystemLite = { id: string; name: string };

export type IncidentStatus = Database["public"]["Enums"]["incident_status"];
export type CommsAudience = Database["public"]["Enums"]["comms_audience"];

export const INCIDENT_STATUSES = [
  "declared",
  "contained",
  "resolved",
  "post_mortem",
  "closed",
] as const satisfies readonly IncidentStatus[];

export const COMMS_AUDIENCES = [
  "internal_it",
  "leadership",
  "staff_all",
  "member",
  "vendor",
  "board",
] as const satisfies readonly CommsAudience[];

export type IncidentRow = Database["public"]["Tables"]["incidents"]["Row"] & {
  declarer: UserLite | null;
  systems: SystemLite[];
};

const writeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  severity: z.number().int().min(1).max(4),
  status: z.enum(INCIDENT_STATUSES).optional(),
  impact_summary: z.string().nullable().optional(),
  root_cause: z.string().nullable().optional(),
  post_mortem_md: z.string().nullable().optional(),
  post_mortem_completed_at: z.string().nullable().optional(),
  contained_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  next_test_due_at: z.string().nullable().optional(),
});

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

async function loadSystemsByIncident(
  supabase: any,
  incidentIds: string[],
): Promise<Map<string, SystemLite[]>> {
  const map = new Map<string, SystemLite[]>();
  if (incidentIds.length === 0) return map;
  const { data, error } = await supabase
    .from("incident_systems")
    .select("incident_id, system_id, systems:systems(id, name)")
    .in("incident_id", incidentIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const arr = map.get(row.incident_id) ?? [];
    if (row.systems) arr.push(row.systems as SystemLite);
    map.set(row.incident_id, arr);
  }
  return map;
}

async function decorate(
  supabase: any,
  rows: any[],
): Promise<IncidentRow[]> {
  const userIds = rows.map((r) => r.declared_by).filter(Boolean) as string[];
  const incidentIds = rows.map((r) => r.id) as string[];
  const [users, systems] = await Promise.all([
    loadUsers(supabase, userIds),
    loadSystemsByIncident(supabase, incidentIds),
  ]);
  return rows.map((r) => ({
    ...r,
    declarer: r.declared_by ? users.get(r.declared_by) ?? null : null,
    systems: systems.get(r.id) ?? [],
  }));
}

export const listIncidents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(INCIDENT_STATUSES).optional(),
        severity: z.number().int().min(1).max(4).optional(),
        systemId: z.string().uuid().optional(),
        includeArchived: z.boolean().default(false),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<IncidentRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("incidents")
      .select("*")
      .order("declared_at", { ascending: false });
    if (!data.includeArchived) q = q.is("archived_at", null);
    if (data.status) q = q.eq("status", data.status);
    if (typeof data.severity === "number") q = q.eq("severity", data.severity);

    if (data.systemId) {
      const { data: links, error: linkErr } = await supabase
        .from("incident_systems")
        .select("incident_id")
        .eq("system_id", data.systemId);
      if (linkErr) throw new Error(linkErr.message);
      const ids = (links ?? []).map((l: any) => l.incident_id);
      if (ids.length === 0) return [];
      q = q.in("id", ids);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return decorate(supabase, rows ?? []);
  });

export const getIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<IncidentRow | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const decorated = await decorate(supabase, [row]);
    const first = decorated[0];
    return first ? ((await attachActors(supabase, first)) as any) : null;
  });

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  severity: z.number().int().min(1).max(4),
  impact_summary: z.string().nullable().optional(),
  system_ids: z.array(z.string().uuid()).default([]),
});

export const declareIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const insert = {
      title: data.title,
      severity: data.severity,
      impact_summary: data.impact_summary ?? null,
      status: "declared" as IncidentStatus,
      declared_by: userId,
      declared_at: new Date().toISOString(),
      created_by: userId,
      updated_by: userId,
    };
    const { data: row, error } = await supabase
      .from("incidents")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (data.system_ids.length) {
      const links = data.system_ids.map((sid) => ({
        incident_id: row.id,
        system_id: sid,
      }));
      const { error: linkErr } = await supabase
        .from("incident_systems")
        .insert(links);
      if (linkErr) throw new Error(linkErr.message);
    }

    await supabase.rpc("log_audit", {
      _action: "incident.declare",
      _entity_type: "incidents",
      _entity_id: row.id,
      _before: null,
      _after: row,
    });
    return row;
  });

export const updateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), patch: writeSchema.partial() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prev, error: prevErr } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", data.id)
      .single();
    if (prevErr) throw new Error(prevErr.message);

    const patch: any = { ...data.patch, updated_by: userId };

    // Auto-stamp transition timestamps
    if (data.patch.status && data.patch.status !== prev.status) {
      if (data.patch.status === "contained" && !prev.contained_at) {
        patch.contained_at = patch.contained_at ?? new Date().toISOString();
      }
      if (data.patch.status === "resolved" && !prev.resolved_at) {
        patch.resolved_at = patch.resolved_at ?? new Date().toISOString();
      }
    }

    // If post_mortem_md is being set substantively, mark completion timestamp
    if (
      data.patch.post_mortem_md &&
      data.patch.post_mortem_md.trim().length > 0 &&
      !prev.post_mortem_completed_at &&
      patch.post_mortem_completed_at === undefined
    ) {
      patch.post_mortem_completed_at = new Date().toISOString();
    }

    const { data: next, error } = await supabase
      .from("incidents")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const before: Record<string, Json> = {};
    const after: Record<string, Json> = {};
    const keys = new Set([...Object.keys(patch)]);
    keys.delete("updated_by");
    for (const k of keys) {
      if (JSON.stringify((prev as any)[k]) !== JSON.stringify((next as any)[k])) {
        before[k] = (prev as any)[k];
        after[k] = (next as any)[k];
      }
    }
    if (Object.keys(after).length > 0) {
      const isClose =
        data.patch.status === "closed" && prev.status !== "closed";
      const isStatus =
        data.patch.status && data.patch.status !== prev.status;
      const action = isClose
        ? "incident.close"
        : isStatus
          ? "incident.status"
          : "incident.update";
      await supabase.rpc("log_audit", {
        _action: action,
        _entity_type: "incidents",
        _entity_id: data.id,
        _before: before,
        _after: after,
      });
    }
    return next;
  });

export const setIncidentSystems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        incident_id: z.string().uuid(),
        system_ids: z.array(z.string().uuid()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: delErr } = await supabase
      .from("incident_systems")
      .delete()
      .eq("incident_id", data.incident_id);
    if (delErr) throw new Error(delErr.message);
    if (data.system_ids.length) {
      const { error } = await supabase.from("incident_systems").insert(
        data.system_ids.map((sid) => ({
          incident_id: data.incident_id,
          system_id: sid,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export type CommsRow = Database["public"]["Tables"]["incident_comms"]["Row"] & {
  author: UserLite | null;
};

export const listComms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ incidentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<CommsRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("incident_comms")
      .select("*")
      .eq("incident_id", data.incidentId)
      .order("sent_at", { ascending: false });
    if (error) throw new Error(error.message);
    const authorIds = (rows ?? [])
      .map((r: any) => r.created_by)
      .filter(Boolean) as string[];
    const users = await loadUsers(supabase, authorIds);
    return (rows ?? []).map((r: any) => ({
      ...r,
      author: r.created_by ? users.get(r.created_by) ?? null : null,
    }));
  });

export const addComms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        incident_id: z.string().uuid(),
        audience: z.enum(COMMS_AUDIENCES),
        channel: z.string().trim().max(50).nullable().optional(),
        summary: z.string().trim().min(1).max(4000),
        sent_at: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const insert = {
      incident_id: data.incident_id,
      audience: data.audience,
      channel: data.channel ?? null,
      summary: data.summary,
      sent_at: data.sent_at ?? new Date().toISOString(),
      created_by: userId,
      updated_by: userId,
    };
    const { data: row, error } = await supabase
      .from("incident_comms")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "incident.comms",
      _entity_type: "incidents",
      _entity_id: data.incident_id,
      _before: null,
      _after: row,
    });
    return row;
  });

export type IncidentAuditEntry = {
  id: string;
  action: string;
  before: Json | null;
  after: Json | null;
  created_at: string;
  actor: UserLite | null;
};

export const listIncidentAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ incidentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<IncidentAuditEntry[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, before, after, created_at, actor_id")
      .eq("entity_type", "incidents")
      .eq("entity_id", data.incidentId)
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

export type IncidentsByQuarterRow = { severity: number; count: number };

export const getIncidentsThisQuarterReal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("v_incidents_this_quarter" as any)
      .select("severity,count");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as IncidentsByQuarterRow[];
    const by_severity = { low: 0, medium: 0, high: 0, critical: 0 };
    let total = 0;
    for (const r of rows) {
      total += r.count;
      if (r.severity === 1) by_severity.low += r.count;
      else if (r.severity === 2) by_severity.medium += r.count;
      else if (r.severity === 3) by_severity.high += r.count;
      else if (r.severity === 4) by_severity.critical += r.count;
    }
    return { total, by_severity };
  });
