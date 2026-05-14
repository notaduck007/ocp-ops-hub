import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/layout/skeletons";
import { listSlas } from "@/lib/slas.functions";

export const Route = createFileRoute("/_authenticated/slas/")({
  component: SlasListPage,
});

function SlasListPage() {
  const list = useServerFn(listSlas);
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["slas", { search }],
    queryFn: () => list({ data: { search: search || undefined } }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SLAs</h1>
        <p className="text-sm text-muted-foreground">All SLAs across vendors.</p>
      </div>

      <div className="rounded-md border bg-card p-3">
        <Label className="text-xs">Search</Label>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Last reviewed</TableHead>
              <TableHead>Review status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No SLAs yet.</TableCell></TableRow>
            ) : rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link to="/slas/$slaId" params={{ slaId: s.id }} className="hover:underline">{s.name}</Link>
                </TableCell>
                <TableCell className="text-sm">
                  {s.vendor && (
                    <Link to="/vendors/$vendorId" params={{ vendorId: s.vendor.id }} className="hover:underline">
                      {s.vendor.name}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="text-sm">{s.system?.name ?? <span className="text-muted-foreground">vendor-wide</span>}</TableCell>
                <TableCell className="text-sm">{s.target_type.replace(/_/g, " ")}: {String(s.target_value)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {s.last_reviewed_at ? new Date(s.last_reviewed_at).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  {s.is_overdue
                    ? <Badge variant="destructive">Overdue</Badge>
                    : <Badge variant="secondary">On track</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
