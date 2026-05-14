import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChangeClass, ChangeStatus } from "@/lib/changes.functions";

export function ChangeClassBadge({ value }: { value: ChangeClass }) {
  const map: Record<ChangeClass, string> = {
    standard:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
    normal: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    emergency:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={cn("border-transparent capitalize", map[value])}>
      {value}
    </Badge>
  );
}

export function ChangeStatusBadge({ value }: { value: ChangeStatus }) {
  const map: Record<ChangeStatus, string> = {
    proposed:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
    approved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    rejected:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    in_flight:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    completed:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    rolled_back:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  const label: Record<ChangeStatus, string> = {
    proposed: "Proposed",
    approved: "Approved",
    rejected: "Rejected",
    in_flight: "In flight",
    completed: "Completed",
    rolled_back: "Rolled back",
  };
  return (
    <Badge variant="outline" className={cn("border-transparent", map[value])}>
      {label[value]}
    </Badge>
  );
}
