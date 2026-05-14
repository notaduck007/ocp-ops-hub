import { format } from "date-fns";
import type { ReactNode } from "react";

import type { RecordKind } from "./record-kinds";

export const IGNORED_AUDIT_KEYS = new Set<string>([
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
]);

const ABBREVIATIONS: Record<string, string> = {
  rto: "RTO",
  rpo: "RPO",
  mfa: "MFA",
  sla: "SLA",
  slas: "SLAs",
  dr: "DR",
  url: "URL",
  id: "ID",
  ids: "IDs",
  api: "API",
  md: "Markdown",
  ip: "IP",
  uuid: "UUID",
};

export function humanize(key: string): string {
  return key
    .split("_")
    .map((w) => {
      const lw = w.toLowerCase();
      if (ABBREVIATIONS[lw]) return ABBREVIATIONS[lw];
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}|$)/;

const FK_KIND: Record<string, RecordKind> = {
  system_id: "system",
  vendor_id: "vendor",
  policy_id: "policy",
  runbook_id: "runbook",
  owner_id: "person",
  technical_owner_id: "person",
  business_owner_id: "person",
  approver_id: "person",
  requested_by: "person",
  declared_by: "person",
  accepted_by: "person",
  approved_by: "person",
  reviewer_id: "person",
  performed_by_id: "person",
  decision_authority_user_id: "person",
  internal_owner_id: "person",
  linked_incident_id: "incident",
};

export function fkKindFor(key: string): RecordKind | null {
  return FK_KIND[key] ?? null;
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

export function formatAuditValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    return value
      .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v)))
      .join(", ");
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (ISO_DATE_RE.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return format(d, "PP p");
    }
    if (isUuid(value) && (key.endsWith("_id") || key === "id")) {
      return <code className="font-mono text-xs">{value.slice(0, 8)}</code>;
    }
    if (value.length > 80) {
      return (
        <span title={value}>
          {value.slice(0, 77)}…
        </span>
      );
    }
    return value;
  }
  if (typeof value === "object") {
    return <code className="text-xs">{JSON.stringify(value)}</code>;
  }
  return String(value);
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => shallowEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

export function diffKeys(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  const keys = new Set<string>();
  for (const k of Object.keys(before ?? {})) {
    if (!IGNORED_AUDIT_KEYS.has(k)) keys.add(k);
  }
  for (const k of Object.keys(after ?? {})) {
    if (!IGNORED_AUDIT_KEYS.has(k)) keys.add(k);
  }
  return [...keys].filter(
    (k) => !shallowEqual((before ?? {})[k], (after ?? {})[k]),
  );
}
