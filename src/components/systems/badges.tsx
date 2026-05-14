import type { Database } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { CRITICALITY_INTENT } from "@/lib/status-mappings";

type Criticality = Database["public"]["Enums"]["criticality"];
type SystemCategory = Database["public"]["Enums"]["system_category"];

export function CriticalityBadge({ value }: { value: Criticality }) {
  return <StatusBadge intent={CRITICALITY_INTENT[value]}>{value}</StatusBadge>;
}

export function CategoryBadge({ value }: { value: SystemCategory }) {
  return <StatusBadge intent="neutral">{value}</StatusBadge>;
}
