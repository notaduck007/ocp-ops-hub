import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PersonStatusBadge, PersonTypeBadge, RoleLevelBadge } from "@/components/people/badges";
import { PersonForm } from "@/components/people/person-form";
import { AccessGrantForm } from "@/components/access/access-grant-form";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  archivePerson,
  getPerson,
  listAccessGrants,
  listPersonAudit,
  revokeAccessGrant,
  type AccessGrantWithRefs,
} from "@/lib/people.functions";

export const Route = createFileRoute("/_authenticated/people/$personId")({
  component: PersonDetailPage,
});

function PersonDetailPage() {
  const { personId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const isAdmin = role === "admin";

  const get = useServerFn(getPerson);
  const audit = useServerFn(listPersonAudit);
  const archive = useServerFn(archivePerson);

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", personId],
    queryFn: () => get({ data: { id: personId } }),
  });

  const { data: auditEntries = [] } = useQuery({
    queryKey: ["person-audit", personId],
    queryFn: () => audit({ data: { personId } }),
    enabled: canEdit,
  });

  const archiveMut = useMutation({
    mutationFn: (val: boolean) => archive({ data: { id: personId, archive: val } }),
    onSuccess: (_d, val) => {
      toast.success(val ? "Person archived" : "Person unarchived");
      queryClient.invalidateQueries({ queryKey: ["person", personId] });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["access-grants"] });
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!person) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Person not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/people" })}>
          Back to list
        </Button>
      </div>
    );
  }

  const archived = !!person.archived_at;

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/people", label: "People" }}
        title={person.full_name}
        badges={
          <>
            <PersonTypeBadge value={person.type} />
            <PersonStatusBadge value={person.status} />
            {archived && <Badge variant="outline">Archived</Badge>}
          </>
        }
        meta={person.email ?? undefined}
        actions={
          isAdmin && (
            <Button
              variant="outline"
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
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          {canEdit && <TabsTrigger value="activity">Activity</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4 max-w-2xl">
          <PersonForm mode="edit" person={person} readOnly={!canEdit} />
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <AccessTab personId={personId} canEdit={canEdit} />
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

function AccessTab({ personId, canEdit }: { personId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listAccessGrants);
  const revoke = useServerFn(revokeAccessGrant);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AccessGrantWithRefs | null>(null);

  const { data: grants = [], isLoading } = useQuery({
    queryKey: ["access-grants", { personId }],
    queryFn: () => list({ data: { personId, includeArchived: false } }),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Access revoked");
      queryClient.invalidateQueries({ queryKey: ["access-grants"] });
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  });

  return (
    <div className="space-y-3">
      {canEdit && !adding && !editing && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Grant access
          </Button>
        </div>
      )}

      {(adding || editing) && canEdit && (
        <div className="rounded-md border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">
            {editing ? "Edit access" : "Grant new access"}
          </h3>
          <AccessGrantForm
            personId={personId}
            grant={editing ?? undefined}
            onSaved={() => {
              setAdding(false);
              setEditing(null);
            }}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>System</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Granted</TableHead>
              <TableHead>Last reviewed</TableHead>
              {canEdit && <TableHead className="w-[100px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : grants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No access granted.
                </TableCell>
              </TableRow>
            ) : (
              grants.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {g.system?.name ?? "—"}
                    {g.system && (
                      <div className="text-xs capitalize text-muted-foreground">
                        {g.system.category}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <RoleLevelBadge value={g.role_level} />
                  </TableCell>
                  <TableCell>
                    {g.is_admin ? <Badge variant="destructive">Admin</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.granted_at ? new Date(g.granted_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.last_reviewed_at
                      ? new Date(g.last_reviewed_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(g)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Revoke">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will archive this grant. It can be re-issued later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => revokeMut.mutate(g.id)}>
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
