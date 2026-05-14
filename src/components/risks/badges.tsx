import { StatusBadge as UiStatusBadge } from "@/components/ui/status-badge";
import {
  RISK_KIND_INTENT,
  RISK_STATUS_INTENT,
  SEVERITY_INTENT,
  SEVERITY_LABEL,
  type Severity,
} from "@/lib/status-mappings";
import type { RiskKind, RiskStatus } from "@/lib/risks.functions";

function toSeverity(n: number): Severity {
  return (n >= 4 ? 4 : n >= 1 ? n : 1) as Severity;
}

export function SeverityBadge({ value, label = "Sev" }: { value: number; label?: string }) {
  const s = toSeverity(value);
  return (
    <UiStatusBadge intent={SEVERITY_INTENT[s]}>
      {label} {value} · {SEVERITY_LABEL[s]}
    </UiStatusBadge>
  );
}

export function LikelihoodBadge({ value }: { value: number }) {
  return <SeverityBadge value={value} label="Lk" />;
}

export function ScoreBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const bucket: Severity = value >= 12 ? 4 : value >= 8 ? 3 : value >= 4 ? 2 : 1;
  return (
    <UiStatusBadge intent={SEVERITY_INTENT[bucket]} className="font-mono font-semibold">
      {value}
    </UiStatusBadge>
  );
}

export function KindBadge({ value }: { value: RiskKind }) {
  return <UiStatusBadge intent={RISK_KIND_INTENT[value]}>{value}</UiStatusBadge>;
}

export function StatusBadge({ value }: { value: RiskStatus }) {
  return <UiStatusBadge intent={RISK_STATUS_INTENT[value]}>{value}</UiStatusBadge>;
}
