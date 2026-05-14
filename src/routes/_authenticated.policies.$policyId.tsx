import { EvidenceFilesTab } from "@/components/evidence/files-tab";
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PolicyStatusBadge } from "@/components/policies/badges";
import { PolicySummary } from "@/components/policies/policy-summary";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { EditToggle } from "@/components/layout/edit-toggle";
import { detailSearchValidator } from "@/lib/detail-search";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  approveVersion,
  createDraftVersion,
  getPolicy,
  listPolicyVersions,
  retirePolicy,
} from "@/lib/policies.functions";

export const Route = createFileRoute("/_authenticated/policies/$policyId")({
  validateSearch: detailSearchValidator,
  component: PolicyDetailPage,
});

function PolicyDetailPage() {
  const { policyId } = Route.useParams();
  const qc = useQueryClient();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const isAdmin = role === "admin";

  const get = useServerFn(getPolicy);
  const listVer = useServerFn(listPolicyVersions);
  const draftFn = useServerFn(createDraftVersion);
  const approveFn = useServerFn(approveVersion);
  const retireFn = useServerFn(retirePolicy);

  const { data: policy, isLoading } = useQuery({
    queryKey: ["policy", policyId],
    queryFn: () => get({ data: { id: policyId } }),
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["policy-versions", policyId],
    queryFn: () => listVer({ data: { policyId } }),
  });

  const drafts = useMemo(() => versions.filter((v) => v.status === "draft"), [versions]);
  const approvedHistory = useMemo(
    () =>
      versions
        .filter((v) => v.status === "approved" && v.version !== policy?.version)
        .sort((a, b) => b.version - a.version),
    [versions, policy?.version],
  );

  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState("");

  const startEdit = () => {
    const seedDraft = drafts[0];
    setDraftBody(seedDraft?.body_md ?? policy?.body_md ?? "");
    setEditing(true);
  };

  const saveDraft = useMutation({
    mutationFn: () => draftFn({ data: { policy_id: policyId, body_md: draftBody } }),
    onSuccess: () => {
      toast.success("Draft saved");
      qc.invalidateQueries({ queryKey: ["policy-versions", policyId] });
      qc.invalidateQueries({ queryKey: ["policy", policyId] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const approve = useMutation({
    mutationFn: (versionId: string) => approveFn({ data: { version_id: versionId } }),
    onSuccess: () => {
      toast.success("Version approved");
      qc.invalidateQueries({ queryKey: ["policy", policyId] });
      qc.invalidateQueries({ queryKey: ["policy-versions", policyId] });
      qc.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const retire = useMutation({
    mutationFn: () => retireFn({ data: { id: policyId } }),
    onSuccess: () => {
      toast.success("Policy retired");
      qc.invalidateQueries({ queryKey: ["policy", policyId] });
      qc.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (isLoading) return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  if (!policy) return <div>Policy not found.</div>;

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/policies", label: "Policies" }}
        title={policy.title}
        badges={
          <>
            <PolicyStatusBadge value={policy.status} />
            <span className="text-sm text-muted-foreground">v{policy.version}</span>
          </>
        }
        meta={
          <>
            Owner: {policy.owner?.full_name ?? policy.owner?.email ?? "—"}
            {policy.next_review_due_at && (
              <> · Next review {format(new Date(policy.next_review_due_at), "PP")}</>
            )}
          </>
        }
        actions={
          isAdmin && policy.status !== "retired" && (
            <Button variant="outline" onClick={() => retire.mutate()}>
              Retire policy
            </Button>
          )
        }
      />

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="drafts">Drafts {drafts.length > 0 && `(${drafts.length})`}</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <Label>Body (Markdown)</Label>
              <Textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={() => saveDraft.mutate()} disabled={saveDraft.isPending || !draftBody.trim()}>
                  Save draft
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {canEdit && policy.status !== "retired" && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={startEdit}>
                    Edit (creates new draft version)
                  </Button>
                </div>
              )}
              <Card>
                <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
                  <ReactMarkdown>{policy.body_md}</ReactMarkdown>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-4 space-y-3">
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts pending.</p>
          ) : (
            drafts.map((d) => (
              <Card key={d.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    Draft v{d.version} · updated {format(new Date(d.updated_at), "PP p")}
                  </CardTitle>
                  {isAdmin && (
                    <Button size="sm" onClick={() => approve.mutate(d.id)} disabled={approve.isPending}>
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{d.body_md}</ReactMarkdown>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {approvedHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prior approved versions.</p>
          ) : (
            approvedHistory.map((v) => (
              <Card key={v.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    v{v.version} · approved{" "}
                    {v.approved_at ? format(new Date(v.approved_at), "PP") : "—"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                        v{v.version}
                      </div>
                      <div className="prose prose-sm max-w-none rounded border bg-muted/30 p-3 dark:prose-invert">
                        <ReactMarkdown>{v.body_md}</ReactMarkdown>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                        Current v{policy.version}
                      </div>
                      <div className="prose prose-sm max-w-none rounded border bg-muted/30 p-3 dark:prose-invert">
                        <ReactMarkdown>{policy.body_md}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <EvidenceFilesTab kind="policy" linkedEntityType="policy" linkedEntityId={policyId} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
