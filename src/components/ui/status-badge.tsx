import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CLASSES, type StatusIntent } from "@/lib/status-tokens";

type Props = {
  intent: StatusIntent;
  icon?: LucideIcon;
  className?: string;
  title?: string;
  children: ReactNode;
};

export function StatusBadge({ intent, icon: Icon, className, title, children }: Props) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_CLASSES[intent],
        className,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}
