import { createFileRoute } from "@tanstack/react-router";

import { useAuth, useCurrentRole } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: role } = useCurrentRole();

  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome, {name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your role:</span>
          {role ? <Badge variant="secondary">{role}</Badge> : <Badge>loading…</Badge>}
        </div>
      </div>
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        This is the OCP IT Hub. Modules will be added in upcoming releases.
      </div>
    </div>
  );
}
