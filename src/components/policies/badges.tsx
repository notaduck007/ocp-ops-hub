import { StatusBadge } from "@/components/ui/status-badge";
import { POLICY_STATUS_INTENT } from "@/lib/status-mappings";
import type { PolicyStatus } from "@/lib/policies.functions";

const LABEL: Record<PolicyStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  retired: "Retired",
};

export function PolicyStatusBadge({ value }: { value: PolicyStatus }) {
  return <StatusBadge intent={POLICY_STATUS_INTENT[value]}>{LABEL[value]}</StatusBadge>;
}
