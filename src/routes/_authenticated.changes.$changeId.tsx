import { EvidenceFilesTab } from "@/components/evidence/files-tab";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, formatDistanceToNow } from "date-fns";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";
import { toast } from "sonner";

import { AuditEntry } from "@/components/audit/audit-entry";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChangeClassBadge,
  ChangeStatusBadge,
} from "@/components/changes/badges";
import { SystemMultiCombobox } from "@/components/incidents/system-multi-combobox";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { EditToggle } from "@/components/layout/edit-toggle";
import { ChangeSummary } from "@/components/changes/change-summary";
import { RecordLink } from "@/components/record-link";
import { detailSearchValidator } from "@/lib/detail-search";
import {
  getChange,
  listChangeAudit,
  searchOpenIncidents,
  setChangeSystems,
  transitionChange,
  updateChange,
  type ChangePatch,
  type ChangeRow,
  type ChangeStatus,
} from "@/lib/changes.functions";
import { useCanEdit, useIsAdmin } from "@/hooks/use-role";
import { AdminOnly } from "@/components/auth/role-gate";
import { errMessage } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/changes/$changeId",
)({
  validateSearch: detailSearchValidator,
  component: ChangeDetailPage,
});

function ChangeDetailPage() {
  const { changeId } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const canEdit = useCanEdit();

  const get = useServerFn(getChange);
  const update = useServerFn(updateChange);
  const transition = useServerFn(transitionChange);
  const setSystems = useServerFn(setChangeSystems);
  const auditList = useServerFn(listChangeAudit);
  const incidentSearch = useServerFn(searchOpenIncidents);

  const { data: change } = useQuery({
    queryKey: ["change", changeId],
    queryFn: () => get({ data: { id: changeId } }),
  });
  const { data: audit = [] } = useQuery({
    queryKey: ["change-audit", changeId],
    queryFn: () => auditList({ data: { changeId } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["change", changeId] });
    qc.invalidateQueries({ queryKey: ["change-audit", changeId] });
    qc.invalidateQueries({ queryKey: ["changes"] });
  };

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      update({ data: { id: changeId, patch: patch as any } }),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  const transitionMutation = useMutation({
    mutationFn: (vars: {
      status: any;
      rollback_note?: string | null;
      scheduled_at?: string | null;
    }) =>
      transition({
        data: {
          id: changeId,
          status: vars.status,
          rollback_note: vars.rollback_note ?? null,
          scheduled_at: vars.scheduled_at ?? undefined,
        },
      }),
    onSuccess: (_d, v) => {
      toast.success(`Status → ${String(v.status).replace("_", " ")}`);
      invalidate();
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  const systemsMutation = useMutation({
    mutationFn: (ids: string[]) =>
      setSystems({ data: { change_id: changeId, system_ids: ids } }),
    onSuccess: () => {
      toast.success("Systems updated");
      invalidate();
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  if (!change) {
    return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  }

  const overviewEditable = canEdit && (isAdmin || change.status === "proposed");
  const editing = !!edit && overviewEditable;
  const enterEdit = () => navigate({ to: ".", search: { edit: true } });
  const exitEdit = () => navigate({ to: ".", search: { edit: undefined } });

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/changes", label: "All changes" }}
        title={change.title}
        badges={
          <>
            <ChangeClassBadge value={change.class} />
            <ChangeStatusBadge value={change.status} />
          </>
        }
        meta={
          <>
            Requested{" "}
            {formatDistanceToNow(new Date(change.created_at), { addSuffix: true })}{" "}
            by {change.requester?.full_name ?? change.requester?.email ?? "—"}
            {change.linked_incident && (
              <>
                {" · Linked to "}
                <RecordLink
                  kind="incident"
                  id={change.linked_incident.id}
                  label={change.linked_incident.title}
                />
              </>
            )}
          </>
        }
        actions={
          overviewEditable && (
            <EditToggle editing={editing} onEdit={enterEdit} onCancel={exitEdit} />
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">
            Activity {audit.length ? `(${audit.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {editing ? (
            <OverviewTab
              change={change}
              canEdit={true}
              onSave={async (patch) => {
                await updateMutation.mutateAsync(patch);
                exitEdit();
              }}
              onSetSystems={(ids) => systemsMutation.mutate(ids)}
              incidentSearch={incidentSearch}
            />
          ) : (
            <ChangeSummary change={change} />
          )}
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <ApprovalTab
            change={change}
            isAdmin={isAdmin}
            onApprove={() =>
              transitionMutation.mutate({ status: "approved" })
            }
            onReject={() =>
              transitionMutation.mutate({ status: "rejected" })
            }
          />
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          <ExecutionTab
            change={change}
            canEdit={canEdit}
            onStart={(scheduled_at) =>
              transitionMutation.mutate({
                status: "in_flight",
                scheduled_at,
              })
            }
            onComplete={() =>
              transitionMutation.mutate({ status: "completed" })
            }
            onRollback={(note) =>
              transitionMutation.mutate({
                status: "rolled_back",
                rollback_note: note,
              })
            }
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-3">
          {audit.length === 0 ? (
            <EmptyState icon={ScrollText} title="No activity yet" description="Edits to this record will appear here." variant="card" />
          ) : (
            audit.map((a) => <AuditEntry key={a.id} entry={a} />)
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-2">
          <EvidenceFilesTab kind="change" linkedEntityType="change" linkedEntityId={changeId} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function OverviewTab({
  change,
  canEdit,
  onSave,
  onSetSystems,
  incidentSearch,
}: {
  change: any;
  canEdit: boolean;
  onSave: (patch: Record<string, unknown>) => void | Promise<void>;
  onSetSystems: (ids: string[]) => void;
  incidentSearch: ReturnType<typeof useServerFn<typeof searchOpenIncidents>>;
}) {
  const [form, setForm] = useState({
    description: change.description ?? "",
    risk_summary: change.risk_summary ?? "",
    rollback_plan: change.rollback_plan ?? "",
    comms_plan: change.comms_plan ?? "",
    scheduled_at: change.scheduled_at
      ? new Date(change.scheduled_at).toISOString().slice(0, 16)
      : "",
  });
  const [systems, setSystems] = useState(change.systems ?? []);
  const [incidentQ, setIncidentQ] = useState("");
  const { data: incidents = [] } = useQuery({
    queryKey: ["change-incident-search", incidentQ],
    queryFn: () => incidentSearch({ data: { q: incidentQ } }),
    enabled: canEdit,
    staleTime: 30_000,
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              disabled={!canEdit}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Risk summary</Label>
            <Textarea
              rows={2}
              value={form.risk_summary}
              disabled={!canEdit}
              onChange={(e) =>
                setForm({ ...form, risk_summary: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              Rollback plan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={3}
              value={form.rollback_plan}
              disabled={!canEdit}
              onChange={(e) =>
                setForm({ ...form, rollback_plan: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Comms plan</Label>
            <Textarea
              rows={2}
              value={form.comms_plan}
              disabled={!canEdit}
              onChange={(e) =>
                setForm({ ...form, comms_plan: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Scheduled</Label>
            <Input
              type="datetime-local"
              value={form.scheduled_at}
              disabled={!canEdit}
              onChange={(e) =>
                setForm({ ...form, scheduled_at: e.target.value })
              }
            />
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  onSave({
                    description: form.description || null,
                    risk_summary: form.risk_summary || null,
                    rollback_plan: form.rollback_plan,
                    comms_plan: form.comms_plan || null,
                    scheduled_at: form.scheduled_at
                      ? new Date(form.scheduled_at).toISOString()
                      : null,
                  })
                }
                disabled={!form.rollback_plan.trim()}
              >
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Affected systems</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <SystemMultiCombobox
              value={systems}
              onChange={(next) => {
                setSystems(next);
                onSetSystems(next.map((s) => s.id));
              }}
              disabled={!canEdit}
            />
            {systems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No systems linked.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked incident</CardTitle>
            <CardDescription>
              Tie this change to an incident (e.g. for a remediation).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {change.linked_incident ? (
              <div className="flex items-center justify-between text-sm">
                <Link
                  to="/incidents/$incidentId"
                  params={{ incidentId: change.linked_incident.id }}
                  className="font-medium hover:underline"
                >
                  {change.linked_incident.title}
                </Link>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSave({ linked_incident_id: null })}
                  >
                    Unlink
                  </Button>
                )}
              </div>
            ) : canEdit ? (
              <>
                <Input
                  placeholder="Search incidents…"
                  value={incidentQ}
                  onChange={(e) => setIncidentQ(e.target.value)}
                />
                <ul className="max-h-40 space-y-1 overflow-auto">
                  {incidents.map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                        onClick={() =>
                          onSave({ linked_incident_id: i.id })
                        }
                      >
                        {i.title}
                      </button>
                    </li>
                  ))}
                  {incidents.length === 0 && (
                    <li className="text-xs text-muted-foreground">
                      No matches.
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No incident linked.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApprovalTab({
  change,
  isAdmin,
  onApprove,
  onReject,
}: {
  change: any;
  isAdmin: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval</CardTitle>
        <CardDescription>
          Only admins can approve, reject, or roll back a change.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          Current status: <ChangeStatusBadge value={change.status} />
        </div>
        {change.approver && (
          <p className="text-xs text-muted-foreground">
            Approved by{" "}
            {change.approver.full_name ?? change.approver.email}
            {change.approved_at
              ? ` · ${format(new Date(change.approved_at), "PP p")}`
              : ""}
          </p>
        )}
        {!change.scheduled_at && (
          <p className="text-xs text-amber-600">
            Schedule the change in Overview before it can be started.
          </p>
        )}
        {isAdmin ? (
          <div className="flex gap-2">
            <Button
              onClick={onApprove}
              disabled={change.status !== "proposed"}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={onReject}
              disabled={change.status !== "proposed"}
            >
              Reject
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            You don't have approval permission.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ExecutionTab({
  change,
  canEdit,
  isAdmin,
  onStart,
  onComplete,
  onRollback,
}: {
  change: any;
  canEdit: boolean;
  isAdmin: boolean;
  onStart: (scheduled_at: string | null) => void;
  onComplete: () => void;
  onRollback: (note: string) => void;
}) {
  const [rollbackNote, setRollbackNote] = useState("");
  const canStart = change.status === "approved" && !!change.scheduled_at;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution</CardTitle>
        <CardDescription>
          Start, complete, or roll back the change.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <Stamp label="Approved" value={change.approved_at} />
          <Stamp label="Scheduled" value={change.scheduled_at} />
          <Stamp label="Started" value={change.started_at} />
          <Stamp label="Completed" value={change.completed_at} />
        </div>

        {canEdit ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onStart(null)}
                disabled={!canStart || change.status !== "approved"}
              >
                Start
              </Button>
              <Button
                onClick={onComplete}
                disabled={change.status !== "in_flight"}
              >
                Complete
              </Button>
            </div>

            <AdminOnly mode="disable" disabledTooltip="Admin only — roll back a change">
              <div className="space-y-2 rounded-md border p-3">
                <Label>Roll back (admin only)</Label>
                <Textarea
                  rows={2}
                  placeholder="Why was this rolled back?"
                  value={rollbackNote}
                  onChange={(e) => setRollbackNote(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    disabled={
                      !rollbackNote.trim() ||
                      change.status === "rolled_back" ||
                      change.status === "proposed"
                    }
                    onClick={() => {
                      onRollback(rollbackNote);
                      setRollbackNote("");
                    }}
                  >
                    Mark rolled back
                  </Button>
                </div>
              </div>
            </AdminOnly>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Read-only view.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stamp({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="font-medium text-foreground">{label}</div>
      <div>{value ? format(new Date(value), "PP p") : "—"}</div>
    </div>
  );
}
