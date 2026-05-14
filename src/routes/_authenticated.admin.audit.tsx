import { Fragment, useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No matching audit entries.</td></tr>
            ) : (
              rows.map((r: any) => {
                const isOpen = expanded.has(r.id);
                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-muted/30">
                      <td className="px-2 py-2">
                        <button onClick={() => toggle(r.id)} className="text-muted-foreground">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{format(new Date(r.created_at), "PP p")}</td>
                      <td className="px-3 py-2">{r.actor?.full_name ?? r.actor?.email ?? "—"}</td>
                      <td className="px-3 py-2 font-medium">{r.action}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.entity_type}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/20">
                        <td></td>
                        <td colSpan={4} className="px-3 py-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-medium text-muted-foreground">Before</div>
                              <pre className="max-h-64 overflow-auto rounded border bg-background p-2 text-xs">
{r.before ? JSON.stringify(r.before, null, 2) : "—"}
                              </pre>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-medium text-muted-foreground">After</div>
                              <pre className="max-h-64 overflow-auto rounded border bg-background p-2 text-xs">
{r.after ? JSON.stringify(r.after, null, 2) : "—"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
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
