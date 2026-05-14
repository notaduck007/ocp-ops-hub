import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskKind, RiskStatus } from "@/lib/risks.functions";

const SEV_COLORS: Record<number, string> = {
  4: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  3: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  2: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  1: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
};

const SEV_LABEL: Record<number, string> = { 1: "Low", 2: "Med", 3: "High", 4: "Critical" };

export function SeverityBadge({ value, label = "Sev" }: { value: number; label?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", SEV_COLORS[value] ?? SEV_COLORS[1])}>
      {label} {value} · {SEV_LABEL[value] ?? value}
    </Badge>
  );
}

export function LikelihoodBadge({ value }: { value: number }) {
  return <SeverityBadge value={value} label="Lk" />;
}

export function ScoreBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  // Map 1..16 to color buckets aligned with severity ranges.
  const bucket = value >= 12 ? 4 : value >= 8 ? 3 : value >= 4 ? 2 : 1;
  return (
    <Badge variant="outline" className={cn("font-mono font-semibold", SEV_COLORS[bucket])}>
      {value}
    </Badge>
  );
}

const KIND_VARIANT: Record<RiskKind, "default" | "secondary"> = {
  risk: "default",
  exception: "secondary",
};

export function KindBadge({ value }: { value: RiskKind }) {
  return (
    <Badge variant={KIND_VARIANT[value]} className="capitalize">
      {value}
    </Badge>
  );
}

const STATUS_COLORS: Record<RiskStatus, string> = {
  open: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  mitigating: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  accepted: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
  closed: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
};

export function StatusBadge({ value }: { value: RiskStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_COLORS[value])}>
      {value}
    </Badge>
  );
}
