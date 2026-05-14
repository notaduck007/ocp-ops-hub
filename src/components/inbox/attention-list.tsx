import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import type { AttentionItem } from "@/lib/dashboard.functions";
import { EmptyState } from "@/components/states/empty-state";
import { AttentionRow } from "./attention-row";

export function AttentionList({
  items,
  emptyMessage,
  emptyDescription = "No overdue reviews. Nice work.",
  maxRows,
}: {
  items: AttentionItem[];
  emptyMessage?: string;
  emptyDescription?: string;
  maxRows?: number;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={emptyMessage ?? "All current"}
        description={emptyDescription}
        variant="card"
      />
    );
  }
  const visible = maxRows ? items.slice(0, maxRows) : items;
  const hasMore = maxRows ? items.length > maxRows : false;
  return (
    <div className="divide-y">
      {visible.map((it) => (
        <AttentionRow key={`${it.kind}-${it.id}`} item={it} />
      ))}
      {hasMore && (
        <Link
          to="/inbox"
          className="block px-5 py-3 text-center text-sm text-primary hover:bg-muted/40 hover:underline"
        >
          View all in inbox →
        </Link>
      )}
    </div>
  );
}
