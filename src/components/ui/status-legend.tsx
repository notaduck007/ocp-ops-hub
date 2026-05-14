import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS_LABELS, type StatusIntent } from "@/lib/status-tokens";

const ORDER: StatusIntent[] = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
  "critical",
  "muted",
];

const EXAMPLES: Record<StatusIntent, string> = {
  neutral: "draft, low",
  info: "medium, mitigating, post-mortem",
  success: "approved, resolved, pass",
  warning: "high, contained, in-flight",
  danger: "open, rejected, fail",
  critical: "critical, escalated",
  muted: "closed, retired, inactive",
};

export function StatusLegend() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ORDER.map((intent) => (
        <div key={intent} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <StatusBadge intent={intent}>{STATUS_LABELS[intent]}</StatusBadge>
          <span className="text-xs text-muted-foreground">{EXAMPLES[intent]}</span>
        </div>
      ))}
    </div>
  );
}
