import { StatusBadge } from "@/components/ui/status-badge";
import {
  INCIDENT_STATUS_INTENT,
  INCIDENT_STATUS_LABEL,
  SEVERITY_INTENT,
  SEVERITY_LABEL,
  type Severity,
} from "@/lib/status-mappings";
import type { IncidentStatus, CommsAudience } from "@/lib/incidents.functions";

const AUDIENCE_LABEL: Record<CommsAudience, string> = {
  internal_it: "Internal IT",
  leadership: "Leadership",
  staff_all: "All staff",
  member: "Member",
  vendor: "Vendor",
  board: "Board",
};

export function SeverityBadge({ value }: { value: number }) {
  const s = (value >= 4 ? 4 : value >= 1 ? value : 1) as Severity;
  return (
    <StatusBadge intent={SEVERITY_INTENT[s]}>
      Sev {value} · {SEVERITY_LABEL[s]}
    </StatusBadge>
  );
}

export function IncidentStatusBadge({ value }: { value: IncidentStatus }) {
  return <StatusBadge intent={INCIDENT_STATUS_INTENT[value]}>{INCIDENT_STATUS_LABEL[value]}</StatusBadge>;
}

export function AudienceBadge({ value }: { value: CommsAudience }) {
  return <StatusBadge intent="neutral">{AUDIENCE_LABEL[value]}</StatusBadge>;
}
