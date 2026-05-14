import { Link } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ActorLite } from "@/lib/load-actors";

type Person = {
  id: string;
  linked_user_id?: string | null;
};

export function RelativeTime({ date }: { date: string | Date }) {
  const d = typeof date === "string" ? new Date(date) : date;
  const rel = formatDistanceToNow(d, { addSuffix: true });
  const abs = format(d, "PPpp");
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
            {rel}
          </span>
        </TooltipTrigger>
        <TooltipContent>{abs}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function actorInitials(actor: ActorLite) {
  const src = actor.full_name || actor.email || "?";
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ActorChip({
  actor,
  personId,
}: {
  actor: ActorLite | null | undefined;
  personId?: string | null;
}) {
  if (!actor) return <span className="text-muted-foreground">—</span>;
  const label = actor.full_name || actor.email;
  const inner = (
    <span className="inline-flex items-center gap-1.5">
      <Avatar className="h-[18px] w-[18px]">
        {actor.avatar_url ? (
          <AvatarImage src={actor.avatar_url} alt={label} />
        ) : null}
        <AvatarFallback className="text-[9px]">
          {actorInitials(actor)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{label}</span>
    </span>
  );
  if (personId) {
    return (
      <Link
        to="/people/$personId"
        params={{ personId }}
        className="inline-flex items-center hover:underline"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

interface RecordMetaFooterProps {
  record: {
    created_at?: string | null;
    updated_at?: string | null;
    archived_at?: string | null;
    created_by_user?: ActorLite | null;
    updated_by_user?: ActorLite | null;
  };
  /**
   * Optional map from auth user id -> people row id, so the actor chip can
   * link to /people/$personId when that auth user is also a person record.
   * Most callers will leave this empty; clicks will then render plain names.
   */
  actorPersonIds?: Record<string, string>;
  className?: string;
}

export function RecordMetaFooter({
  record,
  actorPersonIds,
  className,
}: RecordMetaFooterProps) {
  const personIdFor = (uid?: string | null) =>
    uid && actorPersonIds ? actorPersonIds[uid] ?? null : null;

  const parts: React.ReactNode[] = [];
  if (record.created_at) {
    parts.push(
      <span key="created" className="inline-flex items-center gap-1">
        Created <RelativeTime date={record.created_at} /> by{" "}
        <ActorChip
          actor={record.created_by_user ?? null}
          personId={personIdFor(record.created_by_user?.id)}
        />
      </span>,
    );
  }
  if (record.updated_at) {
    parts.push(
      <span key="updated" className="inline-flex items-center gap-1">
        Last edited <RelativeTime date={record.updated_at} /> by{" "}
        <ActorChip
          actor={record.updated_by_user ?? null}
          personId={personIdFor(record.updated_by_user?.id)}
        />
      </span>,
    );
  }
  if (record.archived_at) {
    parts.push(
      <span key="archived" className="inline-flex items-center gap-1">
        Archived <RelativeTime date={record.archived_at} />
      </span>,
    );
  }
  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden>·</span>}
          {p}
        </span>
      ))}
    </div>
  );
}
