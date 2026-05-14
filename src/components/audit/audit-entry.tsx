import { format, formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuditDiff } from "./diff-row";

export interface AuditLogRow {
  id: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; email: string } | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface AuditEntryProps {
  entry: AuditLogRow;
  showEntity?: boolean;
}

export function AuditEntry({ entry, showEntity = false }: AuditEntryProps) {
  const when = new Date(entry.created_at);
  const actorLabel =
    entry.actor?.full_name || entry.actor?.email || "system";

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{entry.action}</Badge>
          <span className="text-sm">{actorLabel}</span>
          {showEntity && entry.entity_type && (
            <span className="text-xs text-muted-foreground">
              · {entry.entity_type}
              {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
            </span>
          )}
        </div>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(when, { addSuffix: true })}
              </span>
            </TooltipTrigger>
            <TooltipContent>{format(when, "PP p")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <AuditDiff
        before={entry.before as Record<string, unknown> | null}
        after={entry.after as Record<string, unknown> | null}
      />
    </div>
  );
}
