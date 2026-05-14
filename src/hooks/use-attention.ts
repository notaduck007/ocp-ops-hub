import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listAttention } from "@/lib/dashboard.functions";

export function useAttention(opts?: { kind?: string; ownerScope?: "all" | "me"; limit?: number }) {
  const fn = useServerFn(listAttention);
  return useQuery({
    queryKey: ["attention", opts ?? {}],
    queryFn: () => fn({ data: opts ?? {} }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useAttentionCount() {
  const q = useAttention();
  return q.data?.count ?? 0;
}
