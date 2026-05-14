import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FeedRowSkeleton } from "@/components/layout/skeletons";
import { AttentionList } from "@/components/inbox/attention-list";
import { useAttention } from "@/hooks/use-attention";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "all", label: "All", kind: undefined as string | undefined },
  { value: "reviews", label: "Reviews", kind: "review" },
  { value: "incidents", label: "Incidents", kind: "incident" },
  { value: "slas", label: "SLAs", kind: "sla" },
  { value: "access", label: "Access", kind: "access_grant" },
  { value: "policies", label: "Policies", kind: "policy_review" },
  { value: "dr", label: "DR", kind: "dr_test" },
] as const;

const inboxSearchSchema = z.object({
  tab: fallback(z.enum(["all", "reviews", "incidents", "slas", "access", "policies", "dr"]), "all").optional(),
  overdue: fallback(z.boolean(), false).optional(),
  soon: fallback(z.boolean(), false).optional(),
  mine: fallback(z.boolean(), false).optional(),
});

export const Route = createFileRoute("/_authenticated/inbox")({
  validateSearch: zodValidator(inboxSearchSchema),
  component: InboxPage,
});

function InboxPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab = search.tab ?? "all";
  const overdueOnly = !!search.overdue;
  const soonOnly = !!search.soon;
  const mine = !!search.mine;

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const query = useAttention({
    kind: activeTab.kind,
    ownerScope: mine ? "me" : "all",
  });

  const filtered = useMemo(() => {
    const items = query.data?.items ?? [];
    if (!overdueOnly && !soonOnly) return items;
    const now = Date.now();
    return items.filter((it) => {
      if (!it.due_at) return false;
      const diff = (new Date(it.due_at).getTime() - now) / 86_400_000;
      if (overdueOnly && diff < 0) return true;
      if (soonOnly && diff >= 0 && diff <= 7) return true;
      return false;
    });
  }, [query.data, overdueOnly, soonOnly]);

  const setSearch = (patch: Partial<z.infer<typeof inboxSearchSchema>>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  };

  return (
    <PageShell>
      <PageHeader eyebrow="ATTENTION" title="Inbox" />

      <Tabs value={tab} onValueChange={(v) => setSearch({ tab: v as typeof tab })}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={overdueOnly} onClick={() => setSearch({ overdue: !overdueOnly || undefined })}>
          Overdue only
        </Chip>
        <Chip active={soonOnly} onClick={() => setSearch({ soon: !soonOnly || undefined })}>
          Due ≤ 7 days
        </Chip>
        <Chip active={mine} onClick={() => setSearch({ mine: !mine || undefined })}>
          Owned by me
        </Chip>
      </div>

      <div className="rounded-lg border bg-card">
        {query.isLoading ? (
          <div className="divide-y">
            <FeedRowSkeleton />
            <FeedRowSkeleton />
            <FeedRowSkeleton />
            <FeedRowSkeleton />
          </div>
        ) : (
          <AttentionList items={filtered} emptyMessage="Nothing needs your attention here." />
        )}
      </div>
    </PageShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full text-xs",
        active && "border-primary bg-primary/10 text-primary",
      )}
    >
      {children}
    </Button>
  );
}
