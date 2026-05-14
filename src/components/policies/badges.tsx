import { Badge } from "@/components/ui/badge";
import type { PolicyStatus } from "@/lib/policies.functions";

export function PolicyStatusBadge({ value }: { value: PolicyStatus }) {
  const map: Record<PolicyStatus, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    retired: { label: "Retired", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  };
  const { label, cls } = map[value];
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}
