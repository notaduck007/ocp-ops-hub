import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  LifeBuoy,
  Building2,
  RefreshCw,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { FeedRowSkeleton } from "@/components/layout/skeletons";
import { AttentionList } from "@/components/inbox/attention-list";

import { useAuth, useCurrentRole } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMfaCoverage } from "@/lib/people.functions";
import {
  getOpenCriticalRisks,
  getOverdueReviews,
  getIncidentsThisQuarter,
  getDrReadiness,
  getVendorHealth,
} from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const STALE = 60_000;

function DashboardPage() {
  const { user } = useAuth();
  const { data: role } = useCurrentRole();
  const qc = useQueryClient();

  const mfaFn = useServerFn(getMfaCoverage);
  const risksFn = useServerFn(getOpenCriticalRisks);
  const overdueFn = useServerFn(getOverdueReviews);
  const incidentsFn = useServerFn(getIncidentsThisQuarter);
  const drFn = useServerFn(getDrReadiness);
  const vendorFn = useServerFn(getVendorHealth);

  const mfa = useQuery({
    queryKey: ["dash", "mfa"],
    queryFn: () => mfaFn(),
    staleTime: STALE,
  });
  const risks = useQuery({
    queryKey: ["dash", "risks"],
    queryFn: () => risksFn(),
    staleTime: STALE,
  });
  const overdue = useQuery({
    queryKey: ["dash", "overdue"],
    queryFn: () => overdueFn(),
    staleTime: STALE,
  });
  const incidents = useQuery({
    queryKey: ["dash", "incidents"],
    queryFn: () => incidentsFn(),
    staleTime: STALE,
  });
  const dr = useQuery({
    queryKey: ["dash", "dr"],
    queryFn: () => drFn(),
    staleTime: STALE,
  });
  const vendor = useQuery({
    queryKey: ["dash", "vendor"],
    queryFn: () => vendorFn(),
    staleTime: STALE,
  });

  const refreshAll = () => qc.invalidateQueries({ queryKey: ["dash"] });

  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "there";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome, {name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your role:</span>
            {role ? (
              <Badge variant="secondary">{role}</Badge>
            ) : (
              <Badge>loading…</Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={refreshAll}
          aria-label="Refresh dashboard"
          title="Refresh dashboard"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* MFA Coverage */}
        <Tile
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
          title="MFA coverage"
          adornment={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help text-xs">
                    proxy
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  v1 proxy: percentage of active people with at least one
                  active grant on a system marked as MFA-required. Real MFA
                  telemetry will arrive with integrations.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        >
          {mfa.data == null ? (
            <Loading />
          ) : mfa.data.eligible_count === 0 ? (
            <EmptyMsg>No active people on MFA-required systems yet.</EmptyMsg>
          ) : (
            <>
              <div className="text-3xl font-semibold">
                {mfa.data.mfa_coverage_pct}%
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${mfa.data.mfa_coverage_pct}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {mfa.data.covered_count} of {mfa.data.eligible_count} eligible
                people
              </div>
            </>
          )}
        </Tile>

        {/* Open Critical Risks */}
        <Tile
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          title="Open critical risks"
        >
          {risks.data == null ? (
            <Loading />
          ) : (
            <>
              <div className="text-3xl font-semibold">{risks.data.count}</div>
              {risks.data.top.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {risks.data.top.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 truncate">
                      <Badge variant="outline" className="px-1.5 py-0">
                        {r.score}
                      </Badge>
                      <Link
                        to="/risks/$riskId"
                        params={{ riskId: r.id }}
                        className="truncate hover:underline"
                      >
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">
                  No open critical risks.
                </div>
              )}
            </>
          )}
        </Tile>

        {/* Overdue Reviews */}
        <Tile
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          title="Overdue reviews"
        >
          {overdue.data == null ? (
            <Loading />
          ) : (
            <>
              <div className="text-3xl font-semibold">
                {overdue.data.count}
              </div>
              <Link
                to="/risks"
                search={{ overdue: true } as any}
                className="mt-2 inline-block text-xs text-primary hover:underline"
              >
                View all →
              </Link>
            </>
          )}
        </Tile>

        {/* Incidents this quarter */}
        <Tile
          icon={<Activity className="h-4 w-4 text-sky-600" />}
          title="Incidents this quarter"
        >
          {incidents.data == null ? (
            <Loading />
          ) : (
            <>
              <div className="text-3xl font-semibold">
                {incidents.data.total}
              </div>
              <MiniBars data={incidents.data.by_severity} />
            </>
          )}
        </Tile>

        {/* DR Readiness */}
        <Tile
          icon={<LifeBuoy className="h-4 w-4 text-indigo-600" />}
          title="DR readiness"
        >
          {dr.data == null ? (
            <Loading />
          ) : (
            <>
              <div className="text-3xl font-semibold">
                {Number(dr.data.readiness_pct ?? 0)}%
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Critical systems with a runbook tested in last 12 months
              </div>
            </>
          )}
        </Tile>

        {/* Vendor Health */}
        <Tile
          icon={<Building2 className="h-4 w-4 text-fuchsia-600" />}
          title="Vendor health"
        >
          {vendor.data == null ? (
            <Loading />
          ) : (
            <>
              <div className="flex items-end gap-6">
                <div>
                  <div className="text-3xl font-semibold">
                    {vendor.data.open_breaches}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Open SLA breaches
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-semibold">
                    {vendor.data.expiring_soon}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Contracts &lt; 60d
                  </div>
                </div>
              </div>
            </>
          )}
        </Tile>
      </div>

      {/* Needs attention feed */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold">Needs attention</h2>
          <p className="text-xs text-muted-foreground">
            Next 10 items overdue for review
          </p>
        </div>
        <div>
          {overdue.data == null ? (
            <div className="divide-y">
              <FeedRowSkeleton />
              <FeedRowSkeleton />
              <FeedRowSkeleton />
            </div>
          ) : (
            <AttentionList items={overdue.data.items as any} maxRows={10} />
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({
  icon,
  title,
  adornment,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  adornment?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {adornment}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function EmptyMsg({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}

function MiniBars({
  data,
}: {
  data: { low: number; medium: number; high: number; critical: number };
}) {
  const max = Math.max(1, data.low, data.medium, data.high, data.critical);
  const items: Array<{ label: string; value: number; cls: string }> = [
    { label: "L", value: data.low, cls: "bg-slate-400" },
    { label: "M", value: data.medium, cls: "bg-sky-500" },
    { label: "H", value: data.high, cls: "bg-amber-500" },
    { label: "C", value: data.critical, cls: "bg-red-600" },
  ];
  return (
    <div className="mt-3 flex items-end gap-2 h-12">
      {items.map((i) => (
        <div key={i.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full ${i.cls} rounded-sm`}
            style={{ height: `${(i.value / max) * 100}%`, minHeight: 2 }}
          />
          <div className="text-[10px] text-muted-foreground">{i.label}</div>
        </div>
      ))}
    </div>
  );
}

function FeedRow({
  item,
}: {
  item: {
    kind: string;
    id: string;
    label: string;
    due_at: string | null;
    owner_name: string | null;
  };
}) {
  const Icon =
    item.kind === "sla"
      ? FileWarning
      : item.kind === "access_grant"
        ? KeyRound
        : ClipboardCheck;

  const due = item.due_at ? new Date(item.due_at) : null;
  const now = Date.now();
  const diffDays = due ? Math.round((due.getTime() - now) / 86_400_000) : null;
  let dueLabel = "—";
  let dueColor = "text-muted-foreground";
  if (diffDays != null) {
    if (diffDays < 0) {
      dueLabel = `${-diffDays} day${-diffDays === 1 ? "" : "s"} overdue`;
      dueColor = "text-red-600";
    } else if (diffDays <= 7) {
      dueLabel = `due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
      dueColor = "text-amber-600";
    } else {
      dueLabel = `due in ${diffDays} days`;
    }
  }

  const linkProps =
    item.kind === "sla"
      ? ({ to: "/slas/$slaId", params: { slaId: item.id } } as const)
      : item.kind === "risk"
        ? ({ to: "/risks/$riskId", params: { riskId: item.id } } as const)
        : ({ to: "/access" } as const);

  return (
    <Link
      {...(linkProps as any)}
      className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{item.label}</div>
          <div className="text-xs text-muted-foreground">
            {item.owner_name ?? "Unassigned"}
          </div>
        </div>
      </div>
      <div className={`shrink-0 text-xs ${dueColor}`}>{dueLabel}</div>
    </Link>
  );
}
