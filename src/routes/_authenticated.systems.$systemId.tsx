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
import { useCanEdit, useIsAdmin } from "@/hooks/use-role";
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
  const canEdit = useCanEdit();
  const isAdmin = useIsAdmin();
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
            <AdminOnly mode="disable" disabledTooltip="Admin only — archive a system">
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
            </AdminOnly>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
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
        <TabsContent value="activity" className="mt-4">
          <div className="space-y-3">
            {auditEntries.length === 0 ? (
              <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              auditEntries.map((e) => <AuditEntry key={e.id} entry={e} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
