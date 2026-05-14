import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/layout/skeletons";
import { ScenarioBadge } from "@/components/runbooks/badges";
import { NewRunbookDialog } from "@/components/runbooks/new-runbook-dialog";
import { listRunbooks } from "@/lib/runbooks.functions";
import { useCanEdit } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/runbooks/")({
  component: RunbooksList,
});

function RunbooksList() {
  const canEdit = useCanEdit();
  const list = useServerFn(listRunbooks);
  const [open, setOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["runbooks"],
    queryFn: () => list({ data: {} }),
  });

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Runbooks</h1>
          <p className="text-sm text-muted-foreground">
            Operational playbooks per system and scenario.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New runbook
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Scenario</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Last tested</TableHead>
              <TableHead>Next due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">No runbooks.</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const last = r.last_tested_at ? new Date(r.last_tested_at) : null;
                const next = r.next_test_due_at ? new Date(r.next_test_due_at) : null;
                const overdue = next && next < today;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        to="/runbooks/$runbookId"
                        params={{ runbookId: r.id }}
                        className="font-medium hover:underline"
                      >
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{r.system?.name ?? "—"}</TableCell>
                    <TableCell><ScenarioBadge value={r.scenario} /></TableCell>
                    <TableCell className="text-sm">{r.owner?.full_name ?? r.owner?.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{last ? format(last, "PP") : "—"}</TableCell>
                    <TableCell className={cn("text-sm", overdue && "text-red-600 font-medium")}>
                      {next ? format(next, "PP") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <NewRunbookDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
