import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/layout/skeletons";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { VendorStatusBadge, ContractEndBadge } from "@/components/vendors/badges";
import { VendorForm } from "@/components/vendors/vendor-form";
import { useCanEdit } from "@/hooks/use-role";
import { listVendors, VENDOR_STATUSES } from "@/lib/vendors.functions";

export const Route = createFileRoute("/_authenticated/vendors/")({
  component: VendorsListPage,
});

function VendorsListPage() {
  const list = useServerFn(listVendors);
  const canEdit = useCanEdit();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vendors", { search, status, includeArchived }],
    queryFn: () => list({
      data: {
        search: search || undefined,
        status: status === "all" ? undefined : (status as any),
        includeArchived,
      },
    }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            External companies providing systems and services.
          </p>
        </div>
        {canEdit && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Vendor</Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>New vendor</SheetTitle>
                <SheetDescription>Add a vendor to the registry.</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <VendorForm mode="create" onSaved={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="min-w-[220px] flex-1">
          <Label className="text-xs">Search</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" />
        </div>
        <div className="w-44">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {VENDOR_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch id="va" checked={includeArchived} onCheckedChange={setIncludeArchived} />
          <Label htmlFor="va" className="text-sm">Show archived</Label>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Contract end</TableHead>
              <TableHead className="text-center">Linked systems</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No vendors yet.</TableCell></TableRow>
            ) : rows.map((v) => (
              <TableRow key={v.id} className={v.archived_at ? "text-muted-foreground" : undefined}>
                <TableCell className="font-medium">
                  <Link to="/vendors/$vendorId" params={{ vendorId: v.id }} className="hover:underline">
                    {v.name}
                  </Link>
                  {v.archived_at && <Badge variant="outline" className="ml-2 text-xs">Archived</Badge>}
                </TableCell>
                <TableCell><VendorStatusBadge value={v.status} /></TableCell>
                <TableCell className="text-sm">
                  {v.internal_owner?.full_name || v.internal_owner?.email || "—"}
                </TableCell>
                <TableCell>
                  <ContractEndBadge date={v.contract_end_at} windowDays={v.renewal_window_days} />
                </TableCell>
                <TableCell className="text-center">{v.linked_systems_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
