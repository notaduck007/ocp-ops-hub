import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_PX: Record<Size, string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

const WORDMARK_TXT: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Logo({
  size = "md",
  withWordmark = true,
  className,
}: {
  size?: Size;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground",
          SIZE_PX[size],
        )}
      >
        OCP
      </span>
      {withWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            WORDMARK_TXT[size],
          )}
        >
          OCP IT Hub
        </span>
      )}
    </span>
  );
}
