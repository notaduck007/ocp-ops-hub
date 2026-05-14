import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";

import { useAuth, useCurrentRole } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMfaCoverage } from "@/lib/people.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: role } = useCurrentRole();
  const mfa = useServerFn(getMfaCoverage);

  const { data: coverage } = useQuery({
    queryKey: ["mfa-coverage"],
    queryFn: () => mfa(),
  });

  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome, {name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your role:</span>
          {role ? <Badge variant="secondary">{role}</Badge> : <Badge>loading…</Badge>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">MFA coverage</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help text-xs">
                    proxy
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  v1 proxy: percentage of active people with at least one active grant on a system
                  marked as MFA-required. Real MFA telemetry will arrive with integrations.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-3 text-3xl font-semibold">
            {coverage?.mfa_coverage_pct == null ? "—" : `${coverage.mfa_coverage_pct}%`}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {coverage
              ? `${coverage.covered_count} of ${coverage.eligible_count} eligible people`
              : "Loading…"}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        This is the OCP IT Hub. More modules coming in upcoming releases.
      </div>
    </div>
  );
}
