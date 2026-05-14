import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  getRunbook,
  listDrTests,
  listRunbookActivity,
  updateRunbook,
} from "@/lib/runbooks.functions";
import { useCurrentRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/runbooks/$runbookId")({
  component: RunbookDetail,
});

function RunbookDetail() {
  const { runbookId } = Route.useParams();
  const qc = useQueryClient();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";

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

  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  const save = useMutation({
    mutationFn: () => upd({ data: { id: runbookId, patch: { body_md: body } } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["runbook", runbookId] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!rb) return <div>Runbook not found.</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/runbooks"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{rb.title}</h1>
          <ScenarioBadge value={rb.scenario} />
        </div>
        <p className="text-sm text-muted-foreground">
          {rb.system?.name ?? "—"} · Owner {rb.owner?.full_name ?? rb.owner?.email ?? "—"}
          {rb.last_tested_at && <> · Last tested {format(new Date(rb.last_tested_at), "PP")}</>}
          {rb.next_test_due_at && <> · Next due {format(new Date(rb.next_test_due_at), "PP")}</>}
        </p>
      </div>

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
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {canEdit && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => { setBody(rb.body_md); setEditing(true); }}>
                    Edit
                  </Button>
                </div>
              )}
              <Card>
                <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
                  <ReactMarkdown>{rb.body_md}</ReactMarkdown>
                </CardContent>
              </Card>
            </>
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
          <div className="rounded-lg border bg-card divide-y">
            {activity.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              activity.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{a.action}</span>
                    {" — "}{a.actor?.full_name ?? a.actor?.email ?? "system"}
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PP p")}</div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <LogTestDialog open={logOpen} onOpenChange={setLogOpen} runbookId={runbookId} />
    </div>
  );
}
