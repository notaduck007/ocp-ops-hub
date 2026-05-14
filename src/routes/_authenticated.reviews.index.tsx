import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/layout/skeletons";
import { listCampaigns } from "@/lib/reviews.functions";
import { useCanEdit } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/reviews/")({
  component: ReviewsList,
});

function ReviewsList() {
  const canEdit = useCanEdit();
  const list = useServerFn(listCampaigns);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => list(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Access reviews</h1>
          <p className="text-sm text-muted-foreground">Periodic re-certification of who has access to what.</p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link to="/reviews/new"><Plus className="mr-2 h-4 w-4" /> New campaign</Link>
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">No campaigns yet.</TableCell></TableRow>
            ) : rows.map((r) => {
              const pct = r.total_items ? Math.round((r.decided_items / r.total_items) * 100) : 0;
              const overdue = !r.completed_at && r.due_at && new Date(r.due_at) < new Date();
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to="/reviews/$campaignId" params={{ campaignId: r.id }} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{r.owner?.full_name ?? r.owner?.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.started_at), "PP")}</TableCell>
                  <TableCell className={`text-sm ${overdue ? "text-red-600 font-medium" : ""}`}>
                    {format(new Date(r.due_at), "PP")}
                  </TableCell>
                  <TableCell className="w-48">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2" />
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {r.decided_items}/{r.total_items}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.completed_at ? (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Complete</Badge>
                    ) : (
                      <Badge variant="outline">In progress</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
