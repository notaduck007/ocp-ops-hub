import * as React from "react";
import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

export function SummarySection({
  title,
  children,
  className,
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card p-5 space-y-4", className)}>
      {title && (
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function SummaryGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  const colsClass =
    cols === 1 ? "" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", colsClass, className)}>
      {children}
    </dl>
  );
}

export function SummaryField({
  label,
  children,
  full,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  const isEmpty =
    children === null ||
    children === undefined ||
    children === "" ||
    (Array.isArray(children) && children.length === 0);
  return (
    <div className={cn(full && "md:col-span-full", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">
        {isEmpty ? <span className="text-muted-foreground">—</span> : children}
      </dd>
    </div>
  );
}

export function MarkdownBlock({
  source,
  empty = "—",
  className,
}: {
  source?: string | null;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (!source || !source.trim()) {
    return <span className="text-sm text-muted-foreground">{empty}</span>;
  }
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        className,
      )}
    >
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  );
}
