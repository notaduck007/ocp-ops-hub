import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, ShieldCheck, ShieldOff, ArrowUpDown } from "lucide-react";

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
import { CategoryBadge, CriticalityBadge } from "@/components/systems/badges";
import { SystemForm } from "@/components/systems/system-form";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  CRITICALITIES,
  SYSTEM_CATEGORIES,
  listSystems,
  type SystemRow,
} from "@/lib/systems.functions";

export const Route = createFileRoute("/_authenticated/systems/")({
  component: SystemsListPage,
});

type SortKey = "name" | "category" | "criticality" | "updated_at";

function SystemsListPage() {
  const list = useServerFn(listSystems);
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [criticality, setCriticality] = useState<string>("all");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["systems", { search, category, criticality, ownerId, includeArchived }],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          category: category === "all" ? undefined : (category as any),
          criticality: criticality === "all" ? undefined : (criticality as any),
          ownerId: ownerId ?? undefined,
          includeArchived,
        },
      }),
  });

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sortKey, sortAsc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Systems</h1>
          <p className="text-sm text-muted-foreground">
            Canonical inventory of every IT system in scope.
          </p>
        </div>
        {canEdit && (
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New System
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>New system</SheetTitle>
                <SheetDescription>
                  Add a system to the inventory. Required fields: name, category, criticality.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <SystemForm mode="create" onSaved={() => setCreateOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="min-w-[220px] flex-1">
          <Label className="text-xs">Search</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
          />
        </div>
        <div className="w-40">
          <Label className="text-xs">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {SYSTEM_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Criticality</Label>
          <Select value={criticality} onValueChange={setCriticality}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CRITICALITIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c}
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortBtn label="Name" active={sortKey === "name"} asc={sortAsc} onClick={() => toggleSort("name")} />
              </TableHead>
              <TableHead>
                <SortBtn label="Category" active={sortKey === "category"} asc={sortAsc} onClick={() => toggleSort("category")} />
              </TableHead>
              <TableHead>
                <SortBtn label="Criticality" active={sortKey === "criticality"} asc={sortAsc} onClick={() => toggleSort("criticality")} />
              </TableHead>
              <TableHead>Business owner</TableHead>
              <TableHead>Technical owner</TableHead>
              <TableHead className="text-center">MFA</TableHead>
              <TableHead>
                <SortBtn label="Updated" active={sortKey === "updated_at"} asc={sortAsc} onClick={() => toggleSort("updated_at")} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No systems match your filters.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((s) => <SystemRowItem key={s.id} system={s} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SortBtn({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-30"} ${active && asc ? "rotate-180" : ""}`} />
    </button>
  );
}

function SystemRowItem({ system }: { system: SystemRow }) {
  const archived = !!system.archived_at;
  return (
    <TableRow className={archived ? "text-muted-foreground" : undefined}>
      <TableCell className="font-medium">
        <Link
          to="/systems/$systemId"
          params={{ systemId: system.id }}
          className="hover:underline"
        >
          {system.name}
        </Link>
        {archived && (
          <Badge variant="outline" className="ml-2 text-xs">
            Archived
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <CategoryBadge value={system.category} />
      </TableCell>
      <TableCell>
        <CriticalityBadge value={system.criticality} />
      </TableCell>
      <TableCell className="text-sm">
        {system.business_owner?.full_name || system.business_owner?.email || "—"}
      </TableCell>
      <TableCell className="text-sm">
        {system.technical_owner?.full_name || system.technical_owner?.email || "—"}
      </TableCell>
      <TableCell className="text-center">
        {system.mfa_required ? (
          <ShieldCheck className="mx-auto h-4 w-4 text-emerald-600" aria-label="MFA required" />
        ) : (
          <ShieldOff className="mx-auto h-4 w-4 text-muted-foreground" aria-label="MFA not required" />
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(system.updated_at).toLocaleString()}
      </TableCell>
    </TableRow>
  );
}
