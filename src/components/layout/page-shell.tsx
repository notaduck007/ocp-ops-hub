import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] space-y-6", className)}>
      {children}
    </div>
  );
}

export type BackTo = {
  to: string;
  label: string;
  params?: Record<string, string>;
};

export interface PageHeaderProps {
  backTo?: BackTo;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}

export function PageHeader({
  backTo,
  title,
  eyebrow,
  badges,
  meta,
  actions,
  tabs,
}: PageHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          {backTo && (
            <Link
              to={backTo.to as never}
              params={backTo.params as never}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              {backTo.label}
            </Link>
          )}
          {eyebrow && (
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {(badges || meta) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {badges && (
                <div className="flex flex-wrap items-center gap-2">{badges}</div>
              )}
              {meta && (
                <div className="text-xs text-muted-foreground">{meta}</div>
              )}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-start gap-2">{actions}</div>
        )}
      </div>
      {tabs}
    </header>
  );
}
