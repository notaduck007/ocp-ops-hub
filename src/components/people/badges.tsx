import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PersonType = Database["public"]["Enums"]["person_type"];
type PersonStatus = Database["public"]["Enums"]["person_status"];
type AccessRoleLevel = Database["public"]["Enums"]["access_role_level"];

const TYPE_STYLES: Record<PersonType, string> = {
  staff: "bg-blue-200 text-blue-900 hover:bg-blue-200",
  contractor: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  vendor_user: "bg-purple-200 text-purple-900 hover:bg-purple-200",
  service_account: "bg-slate-200 text-slate-800 hover:bg-slate-200",
};

const STATUS_STYLES: Record<PersonStatus, string> = {
  active: "bg-emerald-200 text-emerald-900 hover:bg-emerald-200",
  inactive: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  offboarded: "bg-red-200 text-red-900 hover:bg-red-200",
};

const ROLE_STYLES: Record<AccessRoleLevel, string> = {
  read: "bg-slate-200 text-slate-800 hover:bg-slate-200",
  write: "bg-blue-200 text-blue-900 hover:bg-blue-200",
  admin: "bg-amber-200 text-amber-900 hover:bg-amber-200",
  owner: "bg-red-200 text-red-900 hover:bg-red-200",
};

export function PersonTypeBadge({ value }: { value: PersonType }) {
  return (
    <Badge className={cn("border-transparent capitalize", TYPE_STYLES[value])}>
      {value.replace("_", " ")}
    </Badge>
  );
}

export function PersonStatusBadge({ value }: { value: PersonStatus }) {
  return (
    <Badge className={cn("border-transparent capitalize", STATUS_STYLES[value])}>{value}</Badge>
  );
}

export function RoleLevelBadge({ value }: { value: AccessRoleLevel }) {
  return (
    <Badge className={cn("border-transparent capitalize", ROLE_STYLES[value])}>{value}</Badge>
  );
}
