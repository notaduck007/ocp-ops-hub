import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { listUsers, updateUserRole } from "@/lib/users.functions";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/layout/skeletons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusLegend } from "@/components/ui/status-legend";

type AppRole = Database["public"]["Enums"]["app_role"];

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { data: currentRole, isLoading: roleLoading } = useCurrentRole();
  const list = useServerFn(listUsers);
  const update = useServerFn(updateUserRole);
  const qc = useQueryClient();

  const isAdmin = currentRole === "admin";

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; role: AppRole }) =>
      update({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (roleLoading) {
    return <Skeleton className="h-4 w-24" />;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need the <code>admin</code> role to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage role assignments for OCP IT Hub.
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-48">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.isLoading && <TableSkeleton rows={6} cols={3} />}
            {usersQuery.data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {u.avatar_url ? <AvatarImage src={u.avatar_url} /> : null}
                      <AvatarFallback>
                        {(u.full_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.full_name ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={(role) =>
                      mutation.mutate({ userId: u.id, role: role as AppRole })
                    }
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="editor">editor</SelectItem>
                      <SelectItem value="viewer">viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
        <AccordionItem value="legend" className="border-none">
          <AccordionTrigger className="text-sm font-medium">Color key</AccordionTrigger>
          <AccordionContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Status colors used across the app. Every badge — risk, incident, change, vendor, policy — maps to one of these intents.
            </p>
            <StatusLegend />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
