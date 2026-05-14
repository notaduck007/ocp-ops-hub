import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { EditToggle } from "@/components/layout/edit-toggle";
import { IncidentSummary } from "@/components/incidents/incident-summary";
import { detailSearchValidator } from "@/lib/detail-search";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SeverityBadge,
  IncidentStatusBadge,
  AudienceBadge,
} from "@/components/incidents/badges";
import { SystemMultiCombobox } from "@/components/incidents/system-multi-combobox";
import { EvidenceFilesTab } from "@/components/evidence/files-tab";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  getIncident,
  updateIncident,
  setIncidentSystems,
  listComms,
  addComms,
  listIncidentAudit,
  INCIDENT_STATUSES,
  COMMS_AUDIENCES,
  type CommsAudience,
  type IncidentStatus,
} from "@/lib/incidents.functions";

export const Route = createFileRoute(
  "/_authenticated/incidents/$incidentId",
)({
  component: IncidentDetailPage,
});

function IncidentDetailPage() {
  const { incidentId } = Route.useParams();
  const qc = useQueryClient();
  const { data: role } = useCurrentRole();
  const isAdmin = role === "admin";
  const canEdit = isAdmin || role === "editor";

  const get = useServerFn(getIncident);
  const update = useServerFn(updateIncident);
  const setSystems = useServerFn(setIncidentSystems);
  const commsList = useServerFn(listComms);
  const commsAdd = useServerFn(addComms);
  const auditList = useServerFn(listIncidentAudit);

  const { data: incident } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => get({ data: { id: incidentId } }),
  });
  const { data: comms = [] } = useQuery({
    queryKey: ["incident-comms", incidentId],
    queryFn: () => commsList({ data: { incidentId } }),
  });
  const { data: audit = [] } = useQuery({
    queryKey: ["incident-audit", incidentId],
    queryFn: () => auditList({ data: { incidentId } }),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      update({ data: { id: incidentId, patch: patch as any } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
      qc.invalidateQueries({ queryKey: ["incident-audit", incidentId] });
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  });

  if (!incident) {
    return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  }

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/incidents", label: "All incidents" }}
        title={incident.title}
        badges={
          <>
            <SeverityBadge value={incident.severity} />
            <IncidentStatusBadge value={incident.status} />
          </>
        }
        meta={
          <>
            Declared{" "}
            {formatDistanceToNow(new Date(incident.declared_at), {
              addSuffix: true,
            })}{" "}
            by {incident.declarer?.full_name ?? incident.declarer?.email ?? "—"}
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="comms">Comms</TabsTrigger>
          <TabsTrigger value="postmortem">Post-mortem</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <OverviewForm
            incident={incident}
            canEdit={canEdit}
            isAdmin={isAdmin}
            onSave={(patch) => updateMutation.mutate(patch)}
            saving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <Timeline comms={comms} audit={audit} />
        </TabsContent>

        <TabsContent value="comms" className="space-y-4 pt-4">
          {canEdit && (
            <AddCommsForm
              onAdd={async (values) => {
                try {
                  await commsAdd({
                    data: { incident_id: incidentId, ...values },
                  });
                  toast.success("Comms entry added");
                  qc.invalidateQueries({
                    queryKey: ["incident-comms", incidentId],
                  });
                } catch (err: any) {
                  toast.error(String(err?.message ?? err));
                }
              }}
            />
          )}
          <CommsList comms={comms} />
        </TabsContent>

        <TabsContent value="postmortem" className="space-y-4 pt-4">
          <PostMortem
            value={incident.post_mortem_md ?? ""}
            completedAt={incident.post_mortem_completed_at}
            canEdit={canEdit}
            onSave={(md) => updateMutation.mutate({ post_mortem_md: md })}
            saving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="systems" className="space-y-4 pt-4">
          <SystemsTab
            incidentId={incidentId}
            initial={incident.systems}
            canEdit={canEdit}
            onSave={async (ids) => {
              try {
                await setSystems({
                  data: { incident_id: incidentId, system_ids: ids },
                });
                toast.success("Linked systems updated");
                qc.invalidateQueries({ queryKey: ["incident", incidentId] });
                qc.invalidateQueries({ queryKey: ["incidents"] });
              } catch (err: any) {
                toast.error(String(err?.message ?? err));
              }
            }}
          />
        </TabsContent>

        <TabsContent value="files" className="pt-4">
          <EvidenceFilesTab kind="incident" linkedEntityType="incident" linkedEntityId={incidentId} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function OverviewForm({
  incident,
  canEdit,
  isAdmin,
  onSave,
  saving,
}: {
  incident: NonNullable<Awaited<ReturnType<typeof getIncident>>>;
  canEdit: boolean;
  isAdmin: boolean;
  onSave: (patch: any) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(incident.title);
  const [severity, setSeverity] = useState(incident.severity);
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [impact, setImpact] = useState(incident.impact_summary ?? "");
  const [rootCause, setRootCause] = useState(incident.root_cause ?? "");

  const statusOptions = isAdmin
    ? INCIDENT_STATUSES
    : INCIDENT_STATUSES.filter((s) => s !== "closed");

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Severity</label>
          <Select
            value={String(severity)}
            onValueChange={(v) => setSeverity(Number(v))}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Sev {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as IncidentStatus)}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              Only admins can mark an incident closed.
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Impact summary</label>
        <Textarea
          rows={3}
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          disabled={!canEdit}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Root cause</label>
        <Textarea
          rows={3}
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          disabled={!canEdit}
        />
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={() =>
              onSave({
                title,
                severity,
                status,
                impact_summary: impact || null,
                root_cause: rootCause || null,
              })
            }
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

type Comm = Awaited<ReturnType<typeof listComms>>[number];
type AuditEntry = Awaited<ReturnType<typeof listIncidentAudit>>[number];

function Timeline({ comms, audit }: { comms: Comm[]; audit: AuditEntry[] }) {
  const items = useMemo(() => {
    const a: Array<{
      kind: "comms" | "audit";
      at: string;
      node: React.ReactNode;
    }> = [];
    for (const c of comms) {
      a.push({
        kind: "comms",
        at: c.sent_at,
        node: (
          <>
            <AudienceBadge value={c.audience} />
            <span className="text-xs text-muted-foreground">
              {c.channel ? `· ${c.channel}` : ""}
            </span>
            <p className="mt-1 text-sm">{c.summary}</p>
          </>
        ),
      });
    }
    for (const e of audit) {
      a.push({
        kind: "audit",
        at: e.created_at,
        node: (
          <>
            <span className="text-xs font-medium">{e.action}</span>
            <span className="text-xs text-muted-foreground">
              {" "}
              by {e.actor?.full_name ?? e.actor?.email ?? "—"}
            </span>
          </>
        ),
      });
    }
    return a.sort((x, y) => (y.at > x.at ? 1 : -1));
  }, [comms, audit]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        No timeline entries yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <ul className="divide-y">
        {items.map((it, i) => (
          <li key={i} className="flex gap-4 p-4">
            <div className="w-40 shrink-0 text-xs text-muted-foreground">
              {format(new Date(it.at), "PP p")}
            </div>
            <div className="min-w-0 flex-1">{it.node}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddCommsForm({
  onAdd,
}: {
  onAdd: (values: {
    audience: CommsAudience;
    channel: string | null;
    summary: string;
  }) => Promise<void>;
}) {
  const [audience, setAudience] = useState<CommsAudience>("internal_it");
  const [channel, setChannel] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Audience</label>
          <Select
            value={audience}
            onValueChange={(v) => setAudience(v as CommsAudience)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMS_AUDIENCES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Channel</label>
          <Input
            placeholder="email · slack · status_page · board_brief"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          />
        </div>
      </div>
      <Textarea
        rows={3}
        placeholder="What was communicated?"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <div className="flex justify-end">
        <Button
          disabled={!summary.trim() || submitting}
          onClick={async () => {
            setSubmitting(true);
            try {
              await onAdd({
                audience,
                channel: channel.trim() || null,
                summary: summary.trim(),
              });
              setSummary("");
              setChannel("");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Adding…" : "Add entry"}
        </Button>
      </div>
    </div>
  );
}

function CommsList({ comms }: { comms: Comm[] }) {
  if (comms.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        No comms entries yet.
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card">
      <ul className="divide-y">
        {comms.map((c) => (
          <li key={c.id} className="space-y-1 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AudienceBadge value={c.audience} />
              {c.channel && <span>· {c.channel}</span>}
              <span>· {format(new Date(c.sent_at), "PP p")}</span>
              {c.author && (
                <span>
                  · by {c.author.full_name ?? c.author.email}
                </span>
              )}
            </div>
            <p className="text-sm">{c.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PostMortem({
  value,
  completedAt,
  canEdit,
  onSave,
  saving,
}: {
  value: string;
  completedAt: string | null;
  canEdit: boolean;
  onSave: (md: string) => void;
  saving: boolean;
}) {
  const [md, setMd] = useState(value);
  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Post-mortem</h3>
          <p className="text-xs text-muted-foreground">
            {completedAt
              ? `Completed ${format(new Date(completedAt), "PP p")}`
              : "Required to close Sev 1 / Sev 2 incidents."}
          </p>
        </div>
      </div>
      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="pt-3">
          <Textarea
            rows={14}
            value={md}
            onChange={(e) => setMd(e.target.value)}
            disabled={!canEdit}
            placeholder="## Summary&#10;...&#10;## Timeline&#10;...&#10;## Root cause&#10;...&#10;## Action items&#10;- [ ] ..."
            className="font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="preview" className="pt-3">
          <div className="prose prose-sm dark:prose-invert max-w-none rounded border bg-background p-4">
            {md.trim() ? (
              <ReactMarkdown>{md}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">Nothing to preview.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => onSave(md)} disabled={saving}>
            {saving ? "Saving…" : "Save post-mortem"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SystemsTab({
  initial,
  canEdit,
  onSave,
}: {
  incidentId: string;
  initial: Array<{ id: string; name: string }>;
  canEdit: boolean;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [systems, setSystems] = useState(initial);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold">Affected systems</h3>
      <SystemMultiCombobox
        value={systems}
        onChange={setSystems}
        disabled={!canEdit}
      />
      {canEdit && (
        <div className="flex justify-end">
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(systems.map((s) => s.id));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save linked systems"}
          </Button>
        </div>
      )}
    </div>
  );
}
