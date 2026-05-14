import { Badge } from "@/components/ui/badge";
import type { DrTestResult, RunbookScenario } from "@/lib/runbooks.functions";

const SCENARIO_LABEL: Record<RunbookScenario, string> = {
  restore: "Restore",
  outage: "Outage",
  failover: "Failover",
  continuity: "Continuity",
  offboarding: "Offboarding",
};

export function ScenarioBadge({ value }: { value: RunbookScenario }) {
  return (
    <Badge variant="outline" className="capitalize">
      {SCENARIO_LABEL[value]}
    </Badge>
  );
}

export function DrResultBadge({ value }: { value: DrTestResult }) {
  const cls =
    value === "pass"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : value === "partial"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";
  return (
    <Badge variant="outline" className={`capitalize ${cls}`}>
      {value}
    </Badge>
  );
}
