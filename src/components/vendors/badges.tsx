import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VendorStatus = Database["public"]["Enums"]["vendor_status"];
type BreachStatus = Database["public"]["Enums"]["breach_status"];

const VENDOR_STYLES: Record<VendorStatus, string> = {
  active: "bg-emerald-200 text-emerald-900 hover:bg-emerald-200",
  onboarding: "bg-blue-200 text-blue-900 hover:bg-blue-200",
  offboarding: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  terminated: "bg-slate-300 text-slate-800 hover:bg-slate-300",
};

const BREACH_STYLES: Record<BreachStatus, string> = {
  open: "bg-red-200 text-red-900 hover:bg-red-200",
  escalated: "bg-orange-200 text-orange-900 hover:bg-orange-200",
  remediated: "bg-emerald-200 text-emerald-900 hover:bg-emerald-200",
  closed_no_action: "bg-slate-200 text-slate-800 hover:bg-slate-200",
};

export function VendorStatusBadge({ value }: { value: VendorStatus }) {
  return <Badge className={cn("border-transparent capitalize", VENDOR_STYLES[value])}>{value}</Badge>;
}

export function BreachStatusBadge({ value }: { value: BreachStatus }) {
  return (
    <Badge className={cn("border-transparent capitalize", BREACH_STYLES[value])}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

export function ContractEndBadge({ date, windowDays = 60 }: { date: string | null; windowDays?: number | null }) {
  if (!date) return <span className="text-sm text-muted-foreground">—</span>;
  const end = new Date(date);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const w = windowDays ?? 60;
  const soon = days <= w;
  const past = days < 0;
  return (
    <Badge
      className={cn(
        "border-transparent",
        past ? "bg-red-300 text-red-900 hover:bg-red-300"
          : soon ? "bg-red-200 text-red-900 hover:bg-red-200"
          : "bg-slate-200 text-slate-800 hover:bg-slate-200",
      )}
      title={`${days} day${days === 1 ? "" : "s"}`}
    >
      {end.toLocaleDateString()}
      {soon && <span className="ml-1 text-xs">({past ? "expired" : `${days}d`})</span>}
    </Badge>
  );
}
