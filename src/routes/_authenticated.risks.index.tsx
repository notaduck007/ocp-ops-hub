import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { OwnerCombobox } from "@/components/owner-combobox";
import {
  KindBadge,
  LikelihoodBadge,
  ScoreBadge,
  SeverityBadge,
  StatusBadge,
} from "@/components/risks/badges";
import { RiskForm } from "@/components/risks/risk-form";
import { useCanEdit } from "@/hooks/use-role";
import { RISK_KINDS, RISK_STATUSES, listRisks, type RiskRow, type RiskKind, type RiskStatus } from "@/lib/risks.functions";

export const Route = createFileRoute("/_authenticated/risks/")({
  component: RisksListPage,
});

function RisksListPage() {
  const list = useServerFn(listRisks);
  const canEdit = useCanEdit();

  const [kind, setKind] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["risks", { kind, status, severity, ownerId, overdueOnly, includeArchived }],
    queryFn: () =>
      list({
        data: {
          kind: kind === "all" ? undefined : (kind as RiskKind),
          status: status === "all" ? undefined : (status as RiskStatus),
          severityGte: severity === "all" ? undefined : Number(severity),
          ownerId: ownerId ?? undefined,
          overdueOnly,
          includeArchived,
        },
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risks &amp; exceptions</h1>
          <p className="text-sm text-muted-foreground">
            Unified register of identified risks and policy exceptions.
          </p>
        </div>
        {canEdit && (
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New risk
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>New risk or exception</SheetTitle>
                <SheetDescription>Track and triage residual risk.</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <RiskForm mode="create" onSaved={() => setCreateOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="w-36">
          <Label className="text-xs">Kind</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {RISK_KINDS.map((k) => (
                <SelectItem key={k} value={k} className="capitalize">
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {RISK_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Severity ≥</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}+
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label className="text-xs">Owner</Label>
          <OwnerCombobox value={ownerId} onChange={setOwnerId} placeholder="Any owner" />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch id="overdue" checked={overdueOnly} onCheckedChange={setOverdueOnly} />
          <Label htmlFor="overdue" className="text-sm">
            Overdue review
          </Label>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch
            id="show-archived"
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <Label htmlFor="show-archived" className="text-sm">
            Show archived
          </Label>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Likelihood</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={8} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={ShieldAlert}
                    title="No risks yet"
                    description="Capture the first risk or exception to start the register."
                    action={canEdit ? { label: "New risk", onClick: () => setCreateOpen(true) } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => <RiskRowItem key={r.id} risk={r} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RiskRowItem({ risk }: { risk: RiskRow }) {
  const archived = !!risk.archived_at;
  const overdue =
    risk.next_review_due_at && new Date(risk.next_review_due_at) < new Date();

  return (
    <TableRow className={archived ? "text-muted-foreground" : undefined}>
      <TableCell className="font-medium">
        <Link to="/risks/$riskId" params={{ riskId: risk.id }} className="hover:underline">
          {risk.title}
        </Link>
        {archived && (
          <Badge variant="outline" className="ml-2 text-xs">
            Archived
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <KindBadge value={risk.kind} />
      </TableCell>
      <TableCell>
        <SeverityBadge value={risk.severity} />
      </TableCell>
      <TableCell>
        <LikelihoodBadge value={risk.likelihood} />
      </TableCell>
      <TableCell>
        <ScoreBadge value={risk.score} />
      </TableCell>
      <TableCell className="text-sm">
        {risk.owner?.full_name || risk.owner?.email || "—"}
      </TableCell>
      <TableCell>
        <StatusBadge value={risk.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {risk.next_review_due_at ? (
          <span className={overdue ? "font-medium text-red-600" : undefined}>
            {new Date(risk.next_review_due_at).toLocaleDateString()}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}
