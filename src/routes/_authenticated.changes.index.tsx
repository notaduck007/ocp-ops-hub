import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { format } from "date-fns";

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
  ChangeClassBadge,
  ChangeStatusBadge,
} from "@/components/changes/badges";
import { ProposeChangeDialog } from "@/components/changes/propose-dialog";
import {
  CHANGE_CLASSES,
  CHANGE_STATUSES,
  listChanges,
  type ChangeClass,
  type ChangeStatus,
} from "@/lib/changes.functions";
import { useCurrentRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/changes/")({
  component: ChangesListPage,
});

function ChangesListPage() {
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const list = useServerFn(listChanges);

  const [status, setStatus] = useState<ChangeStatus | "all">("all");
  const [klass, setKlass] = useState<ChangeClass | "all">("all");
  const [q, setQ] = useState("");
  const [proposeOpen, setProposeOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["changes", { status, klass }],
    queryFn: () =>
      list({
        data: {
          status: status === "all" ? undefined : status,
          class: klass === "all" ? undefined : klass,
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
          <h1 className="text-2xl font-semibold tracking-tight">Changes</h1>
          <p className="text-sm text-muted-foreground">
            Proposed and executed changes to systems and services.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setProposeOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Propose change
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
            {CHANGE_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={klass} onValueChange={(v) => setKlass(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {CHANGE_CLASSES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Systems</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No changes.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      to="/changes/$changeId"
                      params={{ changeId: r.id }}
                      className="font-medium hover:underline"
                    >
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ChangeClassBadge value={r.class} />
                  </TableCell>
                  <TableCell>
                    <ChangeStatusBadge value={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.scheduled_at
                      ? format(new Date(r.scheduled_at), "PP p")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.requester?.full_name ?? r.requester?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.systems.length}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProposeChangeDialog
        open={proposeOpen}
        onOpenChange={setProposeOpen}
      />
    </div>
  );
}
