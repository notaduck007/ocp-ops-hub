import { Inbox, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  onClick?: () => void;
  to?: string;
};

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
  secondaryAction?: Action;
  variant?: "plain" | "card" | "compact";
  className?: string;
}

function ActionButton({
  action,
  variant,
}: {
  action: Action;
  variant: "default" | "outline";
}) {
  if (action.to) {
    return (
      <Button asChild variant={variant} size="sm">
        <Link to={action.to}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  variant = "plain",
  className,
}: EmptyStateProps) {
  const compact = variant === "compact";
  const inner = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4 gap-2" : "py-12 px-6 gap-3",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} variant="default" />}
          {secondaryAction && (
            <ActionButton action={secondaryAction} variant="outline" />
          )}
        </div>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <div className={cn("rounded-md border border-dashed bg-muted/20", className)}>
        {inner}
      </div>
    );
  }
  return <div className={className}>{inner}</div>;
}
