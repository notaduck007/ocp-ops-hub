import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContinuityScenarioDialog } from "@/components/continuity/scenario-dialog";
import { listContinuityScenarios } from "@/lib/continuity.functions";
import { useCurrentRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/continuity/")({
  component: ContinuityList,
});

function ContinuityList() {
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const list = useServerFn(listContinuityScenarios);
  const [open, setOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["continuity"],
    queryFn: () => list(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Continuity</h1>
          <p className="text-sm text-muted-foreground">
            Business-continuity scenarios with decision authorities and comms templates.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New scenario
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Decision authority</TableHead>
              <TableHead>Linked systems</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-muted-foreground">No scenarios yet.</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      to="/continuity/$scenarioId"
                      params={{ scenarioId: r.id }}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.decision_authority?.full_name ?? r.decision_authority?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{r.linked_systems.length}</TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/continuity/$scenarioId" params={{ scenarioId: r.id }}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ContinuityScenarioDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
