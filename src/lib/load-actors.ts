// Shared helper for joining created_by/updated_by user metadata onto rows
// returned from detail server functions. Plain helper (no server-only deps);
// callers pass their own supabase client.

export type ActorLite = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

export type RecordActors = {
  created_by_user: ActorLite | null;
  updated_by_user: ActorLite | null;
};

export async function loadActorsMap(
  supabase: any,
  ids: (string | null | undefined)[],
): Promise<Map<string, ActorLite>> {
  const unique = Array.from(
    new Set(ids.filter((x): x is string => !!x)),
  );
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url")
    .in("id", unique);
  if (error) throw new Error(error.message);
  return new Map<string, ActorLite>(
    (data ?? []).map((u: ActorLite) => [u.id, u] as const),
  );
}

export async function attachActors<
  T extends { created_by?: string | null; updated_by?: string | null },
>(supabase: any, row: T): Promise<T & RecordActors> {
  const map = await loadActorsMap(supabase, [row.created_by, row.updated_by]);
  return {
    ...row,
    created_by_user: row.created_by ? map.get(row.created_by) ?? null : null,
    updated_by_user: row.updated_by ? map.get(row.updated_by) ?? null : null,
  };
}
