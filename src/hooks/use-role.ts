import { useCurrentRole } from "./use-auth";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export { useCurrentRole };

export function useCanEdit(): boolean {
  const { data: role } = useCurrentRole();
  return role === "admin" || role === "editor";
}

export function useIsAdmin(): boolean {
  const { data: role } = useCurrentRole();
  return role === "admin";
}
