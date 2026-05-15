import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
import { errMessage } from "@/lib/utils";
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
import { RoleLevelBadge, PersonTypeBadge } from "@/components/people/badges";
import { CategoryBadge } from "@/components/systems/badges";
import { useCanEdit } from "@/hooks/use-role";
import {
  PERSON_TYPES,
  listAccessGrants,
  markGrantsReviewed,
} from "@/lib/people.functions";
import { TableSkeleton } from "@/components/layout/skeletons";

const SYSTEM_CATEGORIES = [
  "idp",
  "github",
  "crm",
  "cms",
  "storage",
  "finance",
  "event",
  "security",
  "collab",
  "other",
] as const;

export const Route = createFileRoute("/_authenticated/access")({
  component: AccessListPage,
});

function AccessListPage() {
  const queryClient = useQueryClient();
  const list = useServerFn(listAccessGrants);
  const markReviewed = useServerFn(markGrantsReviewed);
  const canEdit = useCanEdit();

  const [personType, setPersonType] = useState<string>("all");
  const [systemCategory, setSystemCategory] = useState<string>("all");
  const [adminOnly, setAdminOnly] = useState(false);
  const [unreviewed, setUnreviewed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: grants = [], isLoading } = useQuery({
    queryKey: [
      "access-grants",
      { personType, systemCategory, adminOnly, unreviewed, scope: "all" },
    ],
    queryFn: () =>
      list({
        data: {
          personType: personType === "all" ? undefined : (personType as any),
          systemCategory: systemCategory === "all" ? undefined : (systemCategory as any),
          adminOnly: adminOnly || undefined,
          unreviewed90d: unreviewed || undefined,
        },
      }),
  });

  const allIds = useMemo(() => grants.map((g) => g.id), [grants]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  function toggleAll(v: boolean) {
    setSelected(v ? new Set(allIds) : new Set());
  }
  function toggleOne(id: string, v: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const reviewMut = useMutation({
    mutationFn: () => markReviewed({ data: { ids: Array.from(selected) } }),
    onSuccess: (res) => {
      toast.success(`Marked ${res.count} grant${res.count === 1 ? "" : "s"} as reviewed`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["access-grants"] });
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access</h1>
        <p className="text-sm text-muted-foreground">
          Every active access grant across all people and systems.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        <div className="w-44">
          <Label className="text-xs">Person type</Label>
          <Select value={personType} onValueChange={setPersonType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {PERSON_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Label className="text-xs">System category</Label>
          <Select value={systemCategory} onValueChange={setSystemCategory}>
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
        <div className="flex items-center gap-2 pb-1">
          <Switch id="admin-only" checked={adminOnly} onCheckedChange={setAdminOnly} />
          <Label htmlFor="admin-only" className="text-sm">
            Admins only
          </Label>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch id="unreviewed" checked={unreviewed} onCheckedChange={setUnreviewed} />
          <Label htmlFor="unreviewed" className="text-sm">
            Not reviewed in 90+ days
          </Label>
        </div>
        {canEdit && selected.size > 0 && (
          <div className="ml-auto pb-1">
            <Button size="sm" onClick={() => reviewMut.mutate()} disabled={reviewMut.isPending}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark {selected.size} reviewed
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => toggleAll(!!v)}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Person</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Last reviewed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={canEdit ? 7 : 6} />
            ) : grants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 7 : 6}
                  className="text-center text-sm text-muted-foreground"
                >
                  No grants match your filters.
                </TableCell>
              </TableRow>
            ) : (
              grants.map((g) => (
                <TableRow key={g.id}>
                  {canEdit && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(g.id)}
                        onCheckedChange={(v) => toggleOne(g.id, !!v)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {g.person ? (
                      <Link
                        to="/people/$personId"
                        params={{ personId: g.person.id }}
                        className="hover:underline"
                      >
                        {g.person.full_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {g.person && (
                      <div className="mt-1">
                        <PersonTypeBadge value={g.person.type} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {g.system ? (
                      <>
                        <Link
                          to="/systems/$systemId"
                          params={{ systemId: g.system.id }}
                          className="font-medium hover:underline"
                        >
                          {g.system.name}
                        </Link>
                        <div className="mt-1">
                          <CategoryBadge value={g.system.category} />
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <RoleLevelBadge value={g.role_level} />
                  </TableCell>
                  <TableCell>
                    {g.is_admin ? <Badge variant="destructive">Admin</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.last_used_at ? new Date(g.last_used_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.last_reviewed_at
                      ? new Date(g.last_reviewed_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
