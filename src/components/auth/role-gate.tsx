import type { ReactNode } from "react";
import { useCurrentRole, type AppRole } from "@/hooks/use-role";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Mode = "hide" | "disable";

type RoleGateProps = {
  allow: AppRole[];
  mode?: Mode;
  disabledTooltip?: string;
  children: ReactNode;
};

function defaultTooltip(allow: AppRole[]): string {
  const list = allow.join(" or ");
  return `Requires ${list} role.`;
}

export function RoleGate({ allow, mode = "hide", disabledTooltip, children }: RoleGateProps) {
  const { data: role } = useCurrentRole();
  const allowed = role ? allow.includes(role) : false;

  if (allowed) return <>{children}</>;
  if (mode === "hide") return null;

  const tip = disabledTooltip ?? defaultTooltip(allow);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed opacity-50 [&_*]:pointer-events-none"
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AdminOnly({
  mode = "hide",
  disabledTooltip,
  children,
}: {
  mode?: Mode;
  disabledTooltip?: string;
  children: ReactNode;
}) {
  return (
    <RoleGate allow={["admin"]} mode={mode} disabledTooltip={disabledTooltip}>
      {children}
    </RoleGate>
  );
}

export function EditorOrAbove({
  mode = "hide",
  disabledTooltip,
  children,
}: {
  mode?: Mode;
  disabledTooltip?: string;
  children: ReactNode;
}) {
  return (
    <RoleGate allow={["admin", "editor"]} mode={mode} disabledTooltip={disabledTooltip}>
      {children}
    </RoleGate>
  );
}
