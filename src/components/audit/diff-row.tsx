import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  diffKeys,
  formatAuditValue,
  humanize,
} from "@/lib/audit-format";

type Json = Record<string, unknown> | null | undefined;

export interface AuditDiffProps {
  before: Json;
  after: Json;
}

function pillClass(tone: "old" | "new") {
  return cn(
    "inline-flex max-w-full items-center rounded px-1.5 py-0.5 text-xs",
    tone === "old"
      ? "bg-red-50 text-red-900 line-through dark:bg-red-950/40 dark:text-red-200"
      : "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200",
  );
}

export function AuditDiff({ before, after }: AuditDiffProps) {
  if (!before && after) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200">
        Created
      </Badge>
    );
  }
  if (before && !after) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Archived
      </Badge>
    );
  }

  const keys = diffKeys(before, after);
  if (keys.length === 0) {
    return <span className="text-xs text-muted-foreground">No field changes.</span>;
  }

  return (
    <div className="space-y-1.5">
      {keys.map((key) => (
        <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {humanize(key)}
          </span>
          <span className={pillClass("old")}>
            {formatAuditValue(key, (before ?? {})[key])}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className={pillClass("new")}>
            {formatAuditValue(key, (after ?? {})[key])}
          </span>
        </div>
      ))}
    </div>
  );
}
