import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  KeyRound,
  FileWarning,
  ShieldAlert,
  BookText,
  LifeBuoy,
  ShieldCheck,
  AlertOctagon,
  type LucideIcon,
} from "lucide-react";

import { KIND_ICON, KIND_ROUTE, type RecordKind } from "@/lib/record-kinds";
import type { AttentionItem } from "@/lib/dashboard.functions";

const EXTRA_ICON: Record<string, LucideIcon> = {
  sla: FileWarning,
  access_grant: KeyRound,
  sla_review: FileWarning,
  policy_review: BookText,
  dr_test: LifeBuoy,
  mfa_validation: ShieldCheck,
  review: ClipboardCheck,
  incident: AlertOctagon,
  risk: ShieldAlert,
};

function iconFor(kind: string): LucideIcon {
  if (kind in KIND_ICON) return KIND_ICON[kind as RecordKind];
  return EXTRA_ICON[kind] ?? ClipboardCheck;
}

function linkPropsFor(kind: string, id: string): { to: string; params?: Record<string, string> } {
  if (kind in KIND_ROUTE) {
    const r = KIND_ROUTE[kind as RecordKind](id);
    return { to: r.to, params: r.params };
  }
  switch (kind) {
    case "sla":
    case "sla_review":
      return { to: "/slas/$slaId", params: { slaId: id } };
    case "access_grant":
      return { to: "/access" };
    case "policy_review":
      return { to: "/policies/$policyId", params: { policyId: id } };
    case "dr_test":
      return { to: "/dr-plan" };
    case "mfa_validation":
      return { to: "/people" };
    case "review":
      return { to: "/reviews/$campaignId", params: { campaignId: id } };
    default:
      return { to: "/inbox" };
  }
}

function dueState(dueAt: string | null) {
  if (!dueAt) return { label: "—", color: "text-muted-foreground" };
  const diffDays = Math.round((new Date(dueAt).getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0)
    return {
      label: `${-diffDays} day${-diffDays === 1 ? "" : "s"} overdue`,
      color: "text-red-600",
    };
  if (diffDays <= 7)
    return {
      label: `due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      color: "text-amber-600",
    };
  return { label: `due in ${diffDays} days`, color: "text-muted-foreground" };
}

export function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = iconFor(item.kind);
  const due = dueState(item.due_at);
  const linkProps = linkPropsFor(item.kind, item.id);
  const sublabel = item.sublabel ?? item.owner_name ?? "Unassigned";

  return (
    <Link
      to={linkProps.to as never}
      params={linkProps.params as never}
      className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{item.label}</div>
          <div className="truncate text-xs text-muted-foreground">{sublabel}</div>
        </div>
      </div>
      <div className={`shrink-0 text-xs ${due.color}`}>{due.label}</div>
    </Link>
  );
}
