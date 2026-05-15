import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, UserCircle } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/layout/skeletons";
import { PersonStatusBadge, PersonTypeBadge } from "@/components/people/badges";
import { PersonForm } from "@/components/people/person-form";
import { ExportCsvButton } from "@/components/export-csv-button";
import { useCanEdit } from "@/hooks/use-role";
import { PERSON_STATUSES, PERSON_TYPES, listPeople, type PersonRow, type PersonType, type PersonStatus } from "@/lib/people.functions";

export const Route = createFileRoute("/_authenticated/people/")({
  component: PeopleListPage,
});

function PeopleListPage() {
  const list = useServerFn(listPeople);
  const canEdit = useCanEdit();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["people", { search, type, status, includeArchived }],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          type: type === "all" ? undefined : (type as PersonType),
          status: status === "all" ? undefined : (status as PersonStatus),
          includeArchived,
        },
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="text-sm text-muted-foreground">
            Humans and service accounts that may hold access to systems.
          </p>
        </div>
        {canEdit && (
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Person
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>New person</SheetTitle>
                <SheetDescription>Add a person to the directory.</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <PersonForm mode="create" onSaved={() => setCreateOpen(false)} />
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
            placeholder="Name, email, employer…"
          />
        </div>
        <div className="w-44">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
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
        <div className="w-40">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {PERSON_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch
            id="show-archived-people"
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <Label htmlFor="show-archived-people" className="text-sm">
            Show archived
          </Label>
        </div>
      </div>

      <div className="flex justify-end">
        <ExportCsvButton
          filename="people"
          rows={rows}
          columns={[
            { header: "Full name", accessor: (r: PersonRow) => r.full_name },
            { header: "Email", accessor: (r) => r.email ?? "" },
            { header: "Type", accessor: (r) => r.type },
            { header: "Status", accessor: (r) => r.status },
            { header: "Employer", accessor: (r) => r.employer ?? "" },
            { header: "Last reviewed", accessor: (r) => r.last_access_review_at ?? "" },
            { header: "Archived", accessor: (r) => (r.archived_at ? "yes" : "") },
          ]}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table className="text-sm [&_td]:py-2 [&_th]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead>Full name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Employer</TableHead>
              <TableHead>Last reviewed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={UserCircle}
                    title="No people yet"
                    description="Add the first person to start the inventory."
                    action={canEdit ? { label: "New person", onClick: () => setCreateOpen(true) } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => <PersonRowItem key={p.id} person={p} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PersonRowItem({ person }: { person: PersonRow }) {
  const archived = !!person.archived_at;
  return (
    <TableRow className={archived ? "text-muted-foreground" : undefined}>
      <TableCell className="font-medium">
        <Link
          to="/people/$personId"
          params={{ personId: person.id }}
          className="hover:underline"
        >
          {person.full_name}
        </Link>
        {person.email && (
          <div className="text-xs text-muted-foreground">{person.email}</div>
        )}
        {archived && (
          <Badge variant="outline" className="ml-2 text-xs">
            Archived
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <PersonTypeBadge value={person.type} />
      </TableCell>
      <TableCell>
        <PersonStatusBadge value={person.status} />
      </TableCell>
      <TableCell className="text-sm">{person.employer || "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {person.last_access_review_at
          ? new Date(person.last_access_review_at).toLocaleDateString()
          : "—"}
      </TableCell>
    </TableRow>
  );
}
