import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

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
import { CategoryBadge, CriticalityBadge } from "@/components/systems/badges";
import { AuditEntry } from "@/components/audit/audit-entry";
import { SystemForm } from "@/components/systems/system-form";
import { SystemSummary } from "@/components/systems/system-summary";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { EditToggle } from "@/components/layout/edit-toggle";
import { detailSearchValidator } from "@/lib/detail-search";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  archiveSystem,
  getSystem,
  listSystemAudit,
} from "@/lib/systems.functions";

export const Route = createFileRoute("/_authenticated/systems/$systemId")({
  validateSearch: detailSearchValidator,
  component: SystemDetailPage,
});

function SystemDetailPage() {
  const { systemId } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const isAdmin = role === "admin";
  const editing = !!edit && canEdit;

  const get = useServerFn(getSystem);
  const audit = useServerFn(listSystemAudit);
  const archive = useServerFn(archiveSystem);

  const { data: system, isLoading } = useQuery({
    queryKey: ["system", systemId],
    queryFn: () => get({ data: { id: systemId } }),
  });

  const { data: auditEntries = [] } = useQuery({
    queryKey: ["system-audit", systemId],
    queryFn: () => audit({ data: { systemId } }),
  });

  const archiveMut = useMutation({
    mutationFn: (archive_: boolean) => archive({ data: { id: systemId, archive: archive_ } }),
    onSuccess: (_d, archived) => {
      toast.success(archived ? "System archived" : "System unarchived");
      queryClient.invalidateQueries({ queryKey: ["system", systemId] });
      queryClient.invalidateQueries({ queryKey: ["system-audit", systemId] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  });

  const enterEdit = () => navigate({ to: ".", search: { edit: true } });
  const exitEdit = () => navigate({ to: ".", search: { edit: undefined } });

  if (isLoading) {
    return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  }
  if (!system) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">System not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/systems" })}>
          Back to list
        </Button>
      </div>
    );
  }

  const archived = !!system.archived_at;

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/systems", label: "Systems" }}
        title={system.name}
        badges={
          <>
            <CategoryBadge value={system.category} />
            <CriticalityBadge value={system.criticality} />
            {archived && <Badge variant="outline">Archived</Badge>}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <EditToggle
                editing={editing}
                onEdit={enterEdit}
                onCancel={exitEdit}
              />
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveMut.mutate(!archived)}
                disabled={archiveMut.isPending}
              >
                {archived ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canEdit && <TabsTrigger value="activity">Activity</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="mt-4 max-w-2xl">
          {editing ? (
            <SystemForm
              mode="edit"
              system={system}
              readOnly={false}
              onSaved={() => exitEdit()}
            />
          ) : (
            <SystemSummary system={system} />
          )}
        </TabsContent>
        {canEdit && (
          <TabsContent value="activity" className="mt-4">
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
                  {auditEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No activity yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Badge variant="secondary">{e.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.actor?.full_name || e.actor?.email || "—"}
                        </TableCell>
                        <TableCell>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground">
                              View diff
                            </summary>
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
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}
