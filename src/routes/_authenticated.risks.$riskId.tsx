import { EvidenceFilesTab } from "@/components/evidence/files-tab";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  KindBadge,
  LikelihoodBadge,
  ScoreBadge,
  SeverityBadge,
  StatusBadge,
} from "@/components/risks/badges";
import { RiskForm } from "@/components/risks/risk-form";
import { RiskSummary } from "@/components/risks/risk-summary";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { EditToggle } from "@/components/layout/edit-toggle";
import { RecordLink } from "@/components/record-link";
import { detailSearchValidator } from "@/lib/detail-search";
import { useCurrentRole } from "@/hooks/use-auth";
import { getRisk, listRiskAudit } from "@/lib/risks.functions";

export const Route = createFileRoute("/_authenticated/risks/$riskId")({
  validateSearch: detailSearchValidator,
  component: RiskDetailPage,
});

function RiskDetailPage() {
  const { riskId } = Route.useParams();
  const navigate = useNavigate();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";

  const get = useServerFn(getRisk);
  const audit = useServerFn(listRiskAudit);

  const { data: risk, isLoading } = useQuery({
    queryKey: ["risk", riskId],
    queryFn: () => get({ data: { id: riskId } }),
  });

  const { data: auditEntries = [] } = useQuery({
    queryKey: ["risk-audit", riskId],
    queryFn: () => audit({ data: { riskId } }),
    enabled: canEdit,
  });

  if (isLoading) return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  if (!risk) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Risk not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/risks" })}>
          Back to list
        </Button>
      </div>
    );
  }

  const acceptanceEntries = auditEntries.filter(
    (e) => e.action === "risk.accept" || e.action === "risk.close",
  );

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/risks", label: "Risks" }}
        title={risk.title}
        badges={
          <>
            <KindBadge value={risk.kind} />
            <StatusBadge value={risk.status} />
            <SeverityBadge value={risk.severity} />
            <LikelihoodBadge value={risk.likelihood} />
            <ScoreBadge value={risk.score} />
            {risk.archived_at && <Badge variant="outline">Archived</Badge>}
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="links">Linked records</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          {canEdit && <TabsTrigger value="activity">Activity</TabsTrigger>}
          {canEdit && <TabsTrigger value="acceptance">Acceptance</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4 max-w-2xl">
          <RiskForm mode="edit" risk={risk} readOnly={!canEdit} />
        </TabsContent>

        <TabsContent value="links" className="mt-4 max-w-2xl">
          <div className="space-y-3 rounded-md border bg-card p-4 text-sm">
            <LinkRow
              label="System"
              value={
                risk.system ? (
                  <RecordLink kind="system" id={risk.system.id} label={risk.system.name} />
                ) : null
              }
            />
            <LinkRow
              label="Vendor"
              value={
                risk.vendor ? (
                  <RecordLink kind="vendor" id={risk.vendor.id} label={risk.vendor.name} />
                ) : null
              }
            />
            <LinkRow
              label="Policy"
              value={
                risk.policy_id ? (
                  <RecordLink kind="policy" id={risk.policy_id} label={risk.policy_id.slice(0, 8)} />
                ) : null
              }
            />
            <LinkRow
              label="Owner"
              value={
                risk.owner ? (
                  <RecordLink
                    kind="person"
                    id={risk.owner.id}
                    label={risk.owner.full_name || risk.owner.email}
                  />
                ) : null
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4 max-w-3xl">
          <EvidenceFilesTab kind="risk_review" linkedEntityType="risk" linkedEntityId={riskId} />
        </TabsContent>

        {canEdit && (
          <TabsContent value="activity" className="mt-4">
            <AuditTable entries={auditEntries} />
          </TabsContent>
        )}

        {canEdit && (
          <TabsContent value="acceptance" className="mt-4 space-y-4">
            {risk.status === "accepted" && (
              <div className="rounded-md border bg-card p-4 text-sm">
                <div className="font-medium">Currently accepted</div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Accepted by</div>
                    <div>{risk.accepter?.full_name || risk.accepter?.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Accepted at</div>
                    <div>
                      {risk.accepted_at
                        ? new Date(risk.accepted_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Accepted until</div>
                    <div>{risk.accepted_until ?? "—"}</div>
                  </div>
                </div>
                {risk.acceptance_justification && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground">Justification</div>
                    <p className="whitespace-pre-wrap">{risk.acceptance_justification}</p>
                  </div>
                )}
              </div>
            )}
            <AuditTable entries={acceptanceEntries} emptyText="No acceptance events yet." />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}

function LinkRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span>{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

function AuditTable({
  entries,
  emptyText = "No activity yet.",
}: {
  entries: { id: string; action: string; before: any; after: any; created_at: string; actor: { full_name: string | null; email: string } | null }[];
  emptyText?: string;
}) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Changes</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Badge variant="secondary">{e.action}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {e.actor?.full_name || e.actor?.email || "—"}
                </TableCell>
                <TableCell>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">View diff</summary>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px]">
                        {JSON.stringify(e.before, null, 2)}
                      </pre>
                      <pre className="overflow-x-auto rounded bg-muted p-2 text-[11px]">
                        {JSON.stringify(e.after, null, 2)}
                      </pre>
                    </div>
                  </details>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
