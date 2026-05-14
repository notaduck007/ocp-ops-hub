import { EvidenceFilesTab } from "@/components/evidence/files-tab";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SlaForm } from "@/components/slas/sla-form";
import { SlaSummary } from "@/components/slas/sla-summary";
import { AuditEntry } from "@/components/audit/audit-entry";
import { BreachForm } from "@/components/slas/breach-form";
import { BreachStatusBadge } from "@/components/vendors/badges";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { EditToggle } from "@/components/layout/edit-toggle";
import { RecordLink } from "@/components/record-link";
import { detailSearchValidator } from "@/lib/detail-search";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  BREACH_STATUSES, getSla, listBreaches, listSlaAudit, updateBreach,
} from "@/lib/slas.functions";

export const Route = createFileRoute("/_authenticated/slas/$slaId")({
  validateSearch: detailSearchValidator,
  component: SlaDetailPage,
});

function SlaDetailPage() {
  const { slaId } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const isAdmin = role === "admin";
  const editing = !!edit && canEdit;

  const enterEdit = () => navigate({ to: ".", search: { edit: true } });
  const exitEdit = () => navigate({ to: ".", search: { edit: undefined } });

  const get = useServerFn(getSla);
  const lBreaches = useServerFn(listBreaches);
  const audit = useServerFn(listSlaAudit);
  const updBreach = useServerFn(updateBreach);

  const [breachOpen, setBreachOpen] = useState(false);

  const { data: sla, isLoading } = useQuery({
    queryKey: ["sla", slaId], queryFn: () => get({ data: { id: slaId } }),
  });
  const { data: breaches = [] } = useQuery({
    queryKey: ["breaches", { slaId }], queryFn: () => lBreaches({ data: { slaId } }),
  });
  const { data: auditRows = [] } = useQuery({
    queryKey: ["sla-audit", slaId], queryFn: () => audit({ data: { slaId } }),
  });

  const breachMut = useMutation({
    mutationFn: (v: { id: string; status: any }) =>
      updBreach({ data: { id: v.id, patch: { status: v.status } } }),
    onSuccess: () => {
      toast.success("Breach updated");
      qc.invalidateQueries({ queryKey: ["breaches"] });
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });

  if (isLoading) return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  if (!sla) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">SLA not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/slas" })}>Back</Button>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/slas", label: "SLAs" }}
        title={sla.name}
        badges={sla.is_overdue ? <Badge variant="destructive">Review overdue</Badge> : undefined}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            {sla.vendor && (
              <RecordLink kind="vendor" id={sla.vendor.id} label={sla.vendor.name} />
            )}
            {sla.system && <span>· {sla.system.name}</span>}
          </span>
        }
        actions={
          canEdit && (
            <EditToggle editing={editing} onEdit={enterEdit} onCancel={exitEdit} />
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breaches">Breaches ({breaches.length})</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 max-w-2xl">
          {editing ? (
            <SlaForm mode="edit" sla={sla} readOnly={false} onSaved={() => exitEdit()} />
          ) : (
            <SlaSummary sla={sla} />
          )}
        </TabsContent>

        <TabsContent value="breaches" className="mt-4 space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <Sheet open={breachOpen} onOpenChange={setBreachOpen}>
                <SheetTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />Log breach</Button>
                </SheetTrigger>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                  <SheetHeader>
                    <SheetTitle>Log breach</SheetTitle>
                    <SheetDescription>Record a breach against {sla.name}.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <BreachForm slaId={slaId} onSaved={() => setBreachOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closed</TableHead>
                  {canEdit && <TableHead className="w-48">Update</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {breaches.length === 0 ? (
                  <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="text-center text-sm text-muted-foreground">No breaches.</TableCell></TableRow>
                ) : breaches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm text-muted-foreground">{new Date(b.occurred_at).toLocaleString()}</TableCell>
                    <TableCell className="max-w-md truncate text-sm" title={b.impact_summary}>{b.impact_summary}</TableCell>
                    <TableCell><BreachStatusBadge value={b.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.closed_at ? new Date(b.closed_at).toLocaleDateString() : "—"}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Select
                          value={b.status}
                          onValueChange={(v) => {
                            if (v === "closed_no_action" && !isAdmin) {
                              toast.error("Only admins can mark closed without action");
                              return;
                            }
                            breachMut.mutate({ id: b.id, status: v });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BREACH_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} disabled={s === "closed_no_action" && !isAdmin}>
                                {s.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <EvidenceFilesTab kind="sla_review" linkedEntityType="sla" linkedEntityId={slaId} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="space-y-3">
            {auditRows.length === 0 ? (
              <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              auditRows.map((e: any) => <AuditEntry key={e.id} entry={e} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
