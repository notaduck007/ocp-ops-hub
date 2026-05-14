import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IncidentStatus, CommsAudience } from "@/lib/incidents.functions";

export function SeverityBadge({ value }: { value: number }) {
  const map: Record<number, string> = {
    1: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
    2: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    3: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    4: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  const label: Record<number, string> = {
    1: "Sev 1 · Low",
    2: "Sev 2 · Med",
    3: "Sev 3 · High",
    4: "Sev 4 · Crit",
  };
  return (
    <Badge variant="outline" className={cn("border-transparent", map[value])}>
      {label[value] ?? `Sev ${value}`}
    </Badge>
  );
}

export function IncidentStatusBadge({ value }: { value: IncidentStatus }) {
  const map: Record<IncidentStatus, string> = {
    declared: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    contained:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    resolved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    post_mortem:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    closed:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  };
  const label: Record<IncidentStatus, string> = {
    declared: "Declared",
    contained: "Contained",
    resolved: "Resolved",
    post_mortem: "Post-mortem",
    closed: "Closed",
  };
  return (
    <Badge variant="outline" className={cn("border-transparent", map[value])}>
      {label[value]}
    </Badge>
  );
}

export function AudienceBadge({ value }: { value: CommsAudience }) {
  const label: Record<CommsAudience, string> = {
    internal_it: "Internal IT",
    leadership: "Leadership",
    staff_all: "All staff",
    member: "Member",
    vendor: "Vendor",
    board: "Board",
  };
  return <Badge variant="secondary">{label[value]}</Badge>;
}
