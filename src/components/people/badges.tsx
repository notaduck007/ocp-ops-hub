import type { Database } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PERSON_STATUS_INTENT,
  PERSON_TYPE_INTENT,
  ROLE_LEVEL_INTENT,
} from "@/lib/status-mappings";

type PersonType = Database["public"]["Enums"]["person_type"];
type PersonStatus = Database["public"]["Enums"]["person_status"];
type AccessRoleLevel = Database["public"]["Enums"]["access_role_level"];

export function PersonTypeBadge({ value }: { value: PersonType }) {
  return <StatusBadge intent={PERSON_TYPE_INTENT[value]}>{value.replace("_", " ")}</StatusBadge>;
}

export function PersonStatusBadge({ value }: { value: PersonStatus }) {
  return <StatusBadge intent={PERSON_STATUS_INTENT[value]}>{value}</StatusBadge>;
}

export function RoleLevelBadge({ value }: { value: AccessRoleLevel }) {
  return <StatusBadge intent={ROLE_LEVEL_INTENT[value]}>{value}</StatusBadge>;
}
