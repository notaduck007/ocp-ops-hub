import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/layout/skeletons";
import {
  SeverityBadge,
  IncidentStatusBadge,
} from "@/components/incidents/badges";
import { DeclareIncidentDialog } from "@/components/incidents/declare-dialog";
import {
  INCIDENT_STATUSES,
  listIncidents,
  type IncidentStatus,
} from "@/lib/incidents.functions";
import { useCanEdit } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/incidents/")({
  component: IncidentsListPage,
});

function IncidentsListPage() {
  const canEdit = useCanEdit();
  const list = useServerFn(listIncidents);

  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [severity, setSeverity] = useState<string>("all");
  const [q, setQ] = useState("");
  const [declareOpen, setDeclareOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["incidents", { status, severity }],
    queryFn: () =>
      list({
        data: {
          status: status === "all" ? undefined : status,
          severity: severity === "all" ? undefined : Number(severity),
          includeArchived: false,
        },
      }),
  });

  const filtered = rows.filter((r) =>
    q ? r.title.toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Operational record of incidents with potential business impact.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setDeclareOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Declare incident
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search title…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INCIDENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="1">Sev 1</SelectItem>
            <SelectItem value="2">Sev 2</SelectItem>
            <SelectItem value="3">Sev 3</SelectItem>
            <SelectItem value="4">Sev 4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Declared</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Systems</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No incidents.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      to="/incidents/$incidentId"
                      params={{ incidentId: r.id }}
                      className="font-medium hover:underline"
                    >
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge value={r.severity} />
                  </TableCell>
                  <TableCell>
                    <IncidentStatusBadge value={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.declared_at), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.declarer?.full_name ?? r.declarer?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.systems.length === 0
                      ? "—"
                      : r.systems.map((s) => s.name).join(", ")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeclareIncidentDialog
        open={declareOpen}
        onOpenChange={setDeclareOpen}
      />
    </div>
  );
}
