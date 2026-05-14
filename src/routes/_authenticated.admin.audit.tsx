import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentRole } from "@/hooks/use-auth";
import { listAudit, listAuditFilters } from "@/lib/audit.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditEntry } from "@/components/audit/audit-entry";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

const PAGE_SIZE = 50;

function AuditPage() {
  const { data: role } = useCurrentRole();
  const [actor, setActor] = useState<string>("");
  const [entity, setEntity] = useState<string>("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  

  const list = useServerFn(listAudit);
  const filters = useServerFn(listAuditFilters);

  const { data: opts } = useQuery({
    queryKey: ["audit-filters"],
    queryFn: () => filters(),
  });

  const params = useMemo(
    () => ({
      actor_id: actor || null,
      entity_type: entity || null,
      action: action.trim() || null,
      from: from ? new Date(from).toISOString() : null,
      to: to ? new Date(to).toISOString() : null,
      page,
      pageSize: PAGE_SIZE,
    }),
    [actor, entity, action, from, to, page],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["audit", params],
    queryFn: () => list({ data: params }),
  });

  if (role && role !== "admin") {
    throw redirect({ to: "/dashboard" });
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));


  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every mutation tracked across the system.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 md:grid-cols-5">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Actor</label>
          <Select value={actor || "all"} onValueChange={(v) => { setActor(v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Anyone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              {(opts?.users ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ?? u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Entity</label>
          <Select value={entity || "all"} onValueChange={(v) => { setEntity(v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {(opts?.entityTypes ?? []).map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Action contains</label>
          <Input value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} placeholder="e.g. update" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            No matching audit entries.
          </div>
        ) : (
          rows.map((r: any) => <AuditEntry key={r.id} entry={r} showEntity />)
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>{total} entries · page {page + 1} of {pageCount}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
