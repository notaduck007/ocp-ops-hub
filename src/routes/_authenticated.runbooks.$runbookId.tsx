import { EvidenceFilesTab } from "@/components/evidence/files-tab";
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, ScrollText } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScenarioBadge, DrResultBadge } from "@/components/runbooks/badges";
import { LogTestDialog } from "@/components/runbooks/log-test-dialog";
import { RunbookSummary } from "@/components/runbooks/runbook-summary";
import { AuditEntry } from "@/components/audit/audit-entry";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { EditToggle } from "@/components/layout/edit-toggle";
import { detailSearchValidator } from "@/lib/detail-search";
import {
  getRunbook,
  listDrTests,
  listRunbookActivity,
  updateRunbook,
} from "@/lib/runbooks.functions";
import { useCanEdit } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/runbooks/$runbookId")({
  validateSearch: detailSearchValidator,
  component: RunbookDetail,
});

function RunbookDetail() {
  const { runbookId } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = useCanEdit();

  const get = useServerFn(getRunbook);
  const listTests = useServerFn(listDrTests);
  const listAct = useServerFn(listRunbookActivity);
  const upd = useServerFn(updateRunbook);

  const { data: rb, isLoading } = useQuery({
    queryKey: ["runbook", runbookId],
    queryFn: () => get({ data: { id: runbookId } }),
  });
  const { data: tests = [] } = useQuery({
    queryKey: ["dr-tests", runbookId],
    queryFn: () => listTests({ data: { runbookId } }),
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["runbook-activity", runbookId],
    queryFn: () => listAct({ data: { runbookId } }),
  });

  const editing = !!edit && canEdit;
  const [body, setBody] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  // Seed body from server data when entering edit mode.
  useEffect(() => {
    if (editing && rb) setBody((prev) => (prev ? prev : rb.body_md));
  }, [editing, rb]);

  const enterEdit = () => {
    if (rb) setBody(rb.body_md);
    navigate({ to: ".", search: { edit: true } });
  };
  const exitEdit = () => navigate({ to: ".", search: { edit: undefined } });

  const save = useMutation({
    mutationFn: () => upd({ data: { id: runbookId, patch: { body_md: body } } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["runbook", runbookId] });
      exitEdit();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading) return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  if (!rb) return <div>Runbook not found.</div>;

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/runbooks", label: "Runbooks" }}
        title={rb.title}
        badges={<ScenarioBadge value={rb.scenario} />}
        meta={
          <>
            {rb.system?.name ?? "—"} · Owner {rb.owner?.full_name ?? rb.owner?.email ?? "—"}
            {rb.last_tested_at && <> · Last tested {format(new Date(rb.last_tested_at), "PP")}</>}
            {rb.next_test_due_at && <> · Next due {format(new Date(rb.next_test_due_at), "PP")}</>}
          </>
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
          <TabsTrigger value="tests">Tests {tests.length > 0 && `(${tests.length})`}</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <Label>Body (Markdown)</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={() => save.mutate()} disabled={save.isPending || !body.trim()}>Save</Button>
                <Button variant="ghost" onClick={exitEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <RunbookSummary runbook={rb} />
          )}
        </TabsContent>

        <TabsContent value="tests" className="mt-4 space-y-3">
          <div className="flex justify-end">
            {canEdit && (
              <Button onClick={() => setLogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Log new test
              </Button>
            )}
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Performed at</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-muted-foreground">No tests logged.</TableCell></TableRow>
                ) : (
                  tests.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{format(new Date(t.performed_at), "PP p")}</TableCell>
                      <TableCell><DrResultBadge value={t.result} /></TableCell>
                      <TableCell className="text-sm">{t.performed_by?.full_name ?? t.performed_by?.email ?? "—"}</TableCell>
                      <TableCell className="text-sm">{t.duration_minutes != null ? `${t.duration_minutes} min` : "—"}</TableCell>
                      <TableCell className="max-w-md truncate text-sm text-muted-foreground">{t.notes_md ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <EvidenceFilesTab kind="dr_test" linkedEntityType="runbook" linkedEntityId={runbookId} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="space-y-3">
            {activity.length === 0 ? (
              <EmptyState icon={ScrollText} title="No activity yet" description="Edits to this record will appear here." variant="card" />
            ) : (
              activity.map((a: any) => <AuditEntry key={a.id} entry={a} />)
            )}
          </div>
        </TabsContent>
      </Tabs>

      <LogTestDialog open={logOpen} onOpenChange={setLogOpen} runbookId={runbookId} />
    </PageShell>
  );
}
