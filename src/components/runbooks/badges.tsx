import { StatusBadge } from "@/components/ui/status-badge";
import { DR_RESULT_INTENT } from "@/lib/status-mappings";
import type { DrTestResult, RunbookScenario } from "@/lib/runbooks.functions";

const SCENARIO_LABEL: Record<RunbookScenario, string> = {
  restore: "Restore",
  outage: "Outage",
  failover: "Failover",
  continuity: "Continuity",
  offboarding: "Offboarding",
};

export function ScenarioBadge({ value }: { value: RunbookScenario }) {
  return <StatusBadge intent="neutral">{SCENARIO_LABEL[value]}</StatusBadge>;
}

export function DrResultBadge({ value }: { value: DrTestResult }) {
  return <StatusBadge intent={DR_RESULT_INTENT[value]}>{value}</StatusBadge>;
}
