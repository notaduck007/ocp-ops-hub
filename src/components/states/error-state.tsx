import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: "plain" | "card";
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  variant = "plain",
  className,
}: ErrorStateProps) {
  const inner = (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {message && (
          <p className="text-sm text-muted-foreground max-w-md">{message}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
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
