import { StatusBadge } from "@/components/ui/status-badge";
import {
  CHANGE_CLASS_INTENT,
  CHANGE_STATUS_INTENT,
  CHANGE_STATUS_LABEL,
} from "@/lib/status-mappings";
import type { ChangeClass, ChangeStatus } from "@/lib/changes.functions";

export function ChangeClassBadge({ value }: { value: ChangeClass }) {
  return <StatusBadge intent={CHANGE_CLASS_INTENT[value]}>{value}</StatusBadge>;
}

export function ChangeStatusBadge({ value }: { value: ChangeStatus }) {
  return <StatusBadge intent={CHANGE_STATUS_INTENT[value]}>{CHANGE_STATUS_LABEL[value]}</StatusBadge>;
}
