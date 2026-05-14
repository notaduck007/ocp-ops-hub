import type { Database } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { BREACH_STATUS_INTENT, VENDOR_STATUS_INTENT } from "@/lib/status-mappings";

type VendorStatus = Database["public"]["Enums"]["vendor_status"];
type BreachStatus = Database["public"]["Enums"]["breach_status"];

export function VendorStatusBadge({ value }: { value: VendorStatus }) {
  return <StatusBadge intent={VENDOR_STATUS_INTENT[value]}>{value}</StatusBadge>;
}

export function BreachStatusBadge({ value }: { value: BreachStatus }) {
  return <StatusBadge intent={BREACH_STATUS_INTENT[value]}>{value.replace(/_/g, " ")}</StatusBadge>;
}

export function ContractEndBadge({ date, windowDays = 60 }: { date: string | null; windowDays?: number | null }) {
  if (!date) return <span className="text-sm text-muted-foreground">—</span>;
  const end = new Date(date);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const w = windowDays ?? 60;
  const past = days < 0;
  const soon = days <= w;
  const intent = past ? "critical" : soon ? "danger" : "muted";
  return (
    <StatusBadge intent={intent} title={`${days} day${days === 1 ? "" : "s"}`}>
      {end.toLocaleDateString()}
      {soon && <span className="ml-1">({past ? "expired" : `${days}d`})</span>}
    </StatusBadge>
  );
}
