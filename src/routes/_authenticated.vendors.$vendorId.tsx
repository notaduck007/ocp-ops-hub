import { useState } from "react";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageShell, PageHeader } from "@/components/layout/page-shell";
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
import { VendorStatusBadge, BreachStatusBadge, ContractEndBadge } from "@/components/vendors/badges";
import { CategoryBadge, CriticalityBadge } from "@/components/systems/badges";
import { VendorForm } from "@/components/vendors/vendor-form";
import { SlaForm } from "@/components/slas/sla-form";
import { BreachForm } from "@/components/slas/breach-form";
import { useCurrentRole } from "@/hooks/use-auth";
import { archiveVendor, getVendor, listVendorSystems } from "@/lib/vendors.functions";
import {
  BREACH_STATUSES, listBreaches, listSlas, updateBreach,
} from "@/lib/slas.functions";

export const Route = createFileRoute("/_authenticated/vendors/$vendorId")({
  component: VendorDetailPage,
});

function VendorDetailPage() {
  const { vendorId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const isAdmin = role === "admin";

  const get = useServerFn(getVendor);
  const archive = useServerFn(archiveVendor);
  const lSystems = useServerFn(listVendorSystems);
  const lSlas = useServerFn(listSlas);
  const lBreaches = useServerFn(listBreaches);
  const updBreach = useServerFn(updateBreach);

  const [slaSheet, setSlaSheet] = useState(false);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => get({ data: { id: vendorId } }),
  });
  const { data: systems = [] } = useQuery({
    queryKey: ["vendor-systems", vendorId],
    queryFn: () => lSystems({ data: { vendorId } }),
  });
  const { data: slas = [] } = useQuery({
    queryKey: ["vendor-slas", vendorId],
    queryFn: () => lSlas({ data: { vendorId } }),
  });
  const { data: breaches = [] } = useQuery({
    queryKey: ["breaches", { vendorId }],
    queryFn: () => lBreaches({ data: { vendorId } }),
  });

  const archiveMut = useMutation({
    mutationFn: (a: boolean) => archive({ data: { id: vendorId, archive: a } }),
    onSuccess: (_d, a) => {
      toast.success(a ? "Vendor archived" : "Vendor unarchived");
      qc.invalidateQueries({ queryKey: ["vendor", vendorId] });
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });

  const breachMut = useMutation({
    mutationFn: (v: { id: string; status: any }) =>
      updBreach({ data: { id: v.id, patch: { status: v.status } } }),
    onSuccess: () => {
      toast.success("Breach updated");
      qc.invalidateQueries({ queryKey: ["breaches"] });
      qc.invalidateQueries({ queryKey: ["vendor-health"] });
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!vendor) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Vendor not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/vendors" })}>Back</Button>
      </div>
    );
  }
  const archived = !!vendor.archived_at;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/vendors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Vendors
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{vendor.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VendorStatusBadge value={vendor.status} />
            <ContractEndBadge date={vendor.contract_end_at} windowDays={vendor.renewal_window_days} />
            {archived && <Badge variant="outline">Archived</Badge>}
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => archiveMut.mutate(!archived)} disabled={archiveMut.isPending}>
            {archived ? <><ArchiveRestore className="mr-2 h-4 w-4" />Unarchive</> : <><Archive className="mr-2 h-4 w-4" />Archive</>}
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="systems">Systems ({systems.length})</TabsTrigger>
          <TabsTrigger value="slas">SLAs ({slas.length})</TabsTrigger>
          <TabsTrigger value="breaches">Breaches ({breaches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 max-w-3xl">
          <VendorForm mode="edit" vendor={vendor} readOnly={!canEdit} />
        </TabsContent>

        <TabsContent value="systems" className="mt-4">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Criticality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systems.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No systems linked. Set vendor on a system from the Systems page.</TableCell></TableRow>
                ) : systems.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link to="/systems/$systemId" params={{ systemId: s.id }} className="hover:underline">{s.name}</Link>
                    </TableCell>
                    <TableCell><CategoryBadge value={s.category} /></TableCell>
                    <TableCell><CriticalityBadge value={s.criticality} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="slas" className="mt-4 space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <Sheet open={slaSheet} onOpenChange={setSlaSheet}>
                <SheetTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add SLA</Button>
                </SheetTrigger>
                <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                  <SheetHeader>
                    <SheetTitle>New SLA</SheetTitle>
                    <SheetDescription>SLA for {vendor.name}.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <SlaForm mode="create" lockedVendorId={vendorId} onSaved={() => setSlaSheet(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slas.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No SLAs yet.</TableCell></TableRow>
                ) : slas.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link to="/slas/$slaId" params={{ slaId: s.id }} className="hover:underline">{s.name}</Link>
                      {s.is_overdue && <Badge variant="destructive" className="ml-2 text-xs">Review overdue</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{s.system?.name ?? <span className="text-muted-foreground">vendor-wide</span>}</TableCell>
                    <TableCell className="text-sm">{s.target_type.replace(/_/g, " ")}: {String(s.target_value)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">every {s.review_cadence_days}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="breaches" className="mt-4">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occurred</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-48">Update</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {breaches.length === 0 ? (
                  <TableRow><TableCell colSpan={canEdit ? 5 : 4} className="text-center text-sm text-muted-foreground">No breaches.</TableCell></TableRow>
                ) : breaches.map((b) => {
                  const sla = slas.find((s) => s.id === b.sla_id);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm text-muted-foreground">{new Date(b.occurred_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{sla?.name ?? "—"}</TableCell>
                      <TableCell className="max-w-md truncate text-sm" title={b.impact_summary}>{b.impact_summary}</TableCell>
                      <TableCell><BreachStatusBadge value={b.status} /></TableCell>
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
                                <SelectItem
                                  key={s} value={s}
                                  disabled={s === "closed_no_action" && !isAdmin}
                                >
                                  {s.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
