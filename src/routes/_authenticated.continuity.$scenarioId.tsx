import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Edit } from "lucide-react";

import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { ContinuityScenarioSummary } from "@/components/continuity/scenario-summary";

import { Button } from "@/components/ui/button";
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

  if (isLoading) return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  if (!s) return <div>Scenario not found.</div>;

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/continuity", label: "Continuity" }}
        title={s.name}
        actions={
          canEdit && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          )
        }
      />

      <ContinuityScenarioSummary scenario={s} />

      <ContinuityScenarioDialog open={editing} onOpenChange={setEditing} initial={s} />
    </PageShell>
  );
}
