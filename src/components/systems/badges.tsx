import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Criticality = Database["public"]["Enums"]["criticality"];
type SystemCategory = Database["public"]["Enums"]["system_category"];

const CRIT_STYLES: Record<Criticality, string> = {
  low: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  medium: "bg-blue-200 text-blue-900 hover:bg-blue-200",
  high: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  critical: "bg-red-200 text-red-900 hover:bg-red-200",
};

export function CriticalityBadge({ value }: { value: Criticality }) {
  return (
    <Badge className={cn("border-transparent capitalize", CRIT_STYLES[value])}>{value}</Badge>
  );
}

export function CategoryBadge({ value }: { value: SystemCategory }) {
  return (
    <Badge variant="secondary" className="capitalize">
      {value}
    </Badge>
  );
}
