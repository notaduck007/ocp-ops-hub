import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { KIND_ICON, KIND_ROUTE, type RecordKind } from "@/lib/record-kinds";

interface BaseProps {
  kind: RecordKind;
  id: string;
  label: string;
  sublabel?: string;
  className?: string;
}

function chipClass(extra?: string) {
  return cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-0.5 text-sm leading-tight",
    "hover:bg-muted",
    extra,
  );
}

export function RecordLink({
  kind,
  id,
  label,
  sublabel,
  className,
}: BaseProps) {
  const Icon = KIND_ICON[kind];
  const route = KIND_ROUTE[kind](id);
  return (
    <Link
      to={route.to as never}
      params={route.params as never}
      className={chipClass(className)}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate hover:underline">{label}</span>
      {sublabel && (
        <span className="truncate text-xs text-muted-foreground">
          · {sublabel}
        </span>
      )}
    </Link>
  );
}

export function RecordLinkSilent({
  kind,
  id,
  label,
  sublabel,
  className,
}: BaseProps) {
  const route = KIND_ROUTE[kind](id);
  return (
    <Link
      to={route.to as never}
      params={route.params as never}
      className={chipClass(className)}
    >
      <span className="truncate hover:underline">{label}</span>
      {sublabel && (
        <span className="truncate text-xs text-muted-foreground">
          · {sublabel}
        </span>
      )}
    </Link>
  );
}
