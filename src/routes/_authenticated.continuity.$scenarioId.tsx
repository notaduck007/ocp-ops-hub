import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Edit } from "lucide-react";

import { PageShell, PageHeader } from "@/components/layout/page-shell";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContinuityScenarioDialog } from "@/components/continuity/scenario-dialog";
import { getContinuityScenario } from "@/lib/continuity.functions";
import { useCurrentRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/continuity/$scenarioId")({
  component: ContinuityDetail,
});

function ContinuityDetail() {
  const { scenarioId } = Route.useParams();
  const { data: role } = useCurrentRole();
  const canEdit = role === "admin" || role === "editor";
  const get = useServerFn(getContinuityScenario);
  const [editing, setEditing] = useState(false);

  const { data: s, isLoading } = useQuery({
    queryKey: ["continuity", scenarioId],
    queryFn: () => get({ data: { id: scenarioId } }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!s) return <div>Scenario not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/continuity"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
          <p className="text-sm text-muted-foreground">
            Decision authority: {s.decision_authority?.full_name ?? s.decision_authority?.email ?? "—"}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Trigger</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {s.trigger_summary ?? <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Impact</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {s.impact_summary ?? <span className="text-muted-foreground">—</span>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Linked systems & runbooks</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Systems</div>
            {s.linked_systems.length === 0 ? (
              <p className="text-sm text-muted-foreground">None linked.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {s.linked_systems.map((sys) => (
                  <Link key={sys.id} to="/systems/$systemId" params={{ systemId: sys.id }}>
                    <Badge variant="secondary" className="hover:bg-secondary/80">{sys.name}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Runbooks</div>
            {s.linked_runbooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">None linked.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {s.linked_runbooks.map((rb) => (
                  <Link key={rb.id} to="/runbooks/$runbookId" params={{ runbookId: rb.id }}>
                    <Badge variant="secondary" className="hover:bg-secondary/80">{rb.title}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comms template</CardTitle></CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          {s.comms_template_md ? (
            <ReactMarkdown>{s.comms_template_md}</ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground">No template defined.</p>
          )}
        </CardContent>
      </Card>

      <ContinuityScenarioDialog open={editing} onOpenChange={setEditing} initial={s} />
    </div>
  );
}
