import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/layout/skeletons";
import { PolicyStatusBadge } from "@/components/policies/badges";
import { NewPolicyDialog } from "@/components/policies/new-policy-dialog";
import { listPolicies } from "@/lib/policies.functions";
import { useCanEdit } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/policies/")({
  component: PoliciesListPage,
});

function PoliciesListPage() {
  const canEdit = useCanEdit();
  const list = useServerFn(listPolicies);

  const [includeRetired, setIncludeRetired] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["policies", { includeRetired }],
    queryFn: () => list({ data: { includeRetired } }),
  });

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Policies</h1>
          <p className="text-sm text-muted-foreground">
            Approved IT and governance policies, with version history.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New policy
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch id="show-retired" checked={includeRetired} onCheckedChange={setIncludeRetired} />
        <Label htmlFor="show-retired" className="text-sm text-muted-foreground">
          Show retired
        </Label>
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">No policies.</TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const due = r.next_review_due_at ? new Date(r.next_review_due_at) : null;
                const overdue = due && due < today;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        to="/policies/$policyId"
                        params={{ policyId: r.id }}
                        className="font-medium hover:underline"
                      >
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell><PolicyStatusBadge value={r.status} /></TableCell>
                    <TableCell className="text-sm">v{r.version}</TableCell>
                    <TableCell className="text-sm">
                      {r.owner?.full_name ?? r.owner?.email ?? "—"}
                    </TableCell>
                    <TableCell className={cn("text-sm", overdue && "text-red-600 font-medium")}>
                      {due ? format(due, "PP") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <NewPolicyDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
