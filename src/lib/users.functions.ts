import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "admin") throw new Error("Forbidden: admin only");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserRow[]> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");
    if (rolesError) throw new Error(rolesError.message);

    const roleMap = new Map<string, AppRole>(
      (roles ?? []).map((r: { user_id: string; role: AppRole }) => [r.user_id, r.role]),
    );

    return (users ?? []).map((u: any) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      created_at: u.created_at,
      role: roleMap.get(u.id) ?? "viewer",
    }));
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "editor", "viewer"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    // Read current value for audit log.
    const { data: prev } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .maybeSingle();

    const { error } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: data.userId, role: data.role, created_by: userId },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "user_role.update",
      _entity_type: "user_roles",
      _entity_id: data.userId,
      _before: prev ? { role: prev.role } : null,
      _after: { role: data.role },
    });

    return { ok: true as const };
  });
