import { Link } from "@tanstack/react-router";

import type { AttentionItem } from "@/lib/dashboard.functions";
import { AttentionRow } from "./attention-row";

export function AttentionList({
  items,
  emptyMessage = "All current. Nice.",
  maxRows,
}: {
  items: AttentionItem[];
  emptyMessage?: string;
  maxRows?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
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
