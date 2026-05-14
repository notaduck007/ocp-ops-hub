import { EvidenceFilesTab } from "@/components/evidence/files-tab";
import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  completeCampaign,
  decideItem,
  getCampaign,
  listCampaignItems,
  type ReviewItemRow,
} from "@/lib/reviews.functions";

export const Route = createFileRoute("/_authenticated/reviews/$campaignId")({
  component: CampaignWorkspace,
});

const DECISIONS = ["keep", "reduce", "revoke", "investigate"] as const;
type Decision = (typeof DECISIONS)[number];

function CampaignWorkspace() {
  const { campaignId } = Route.useParams();
  const qc = useQueryClient();

  const get = useServerFn(getCampaign);
  const listItems = useServerFn(listCampaignItems);
  const decide = useServerFn(decideItem);
  const complete = useServerFn(completeCampaign);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => get({ data: { id: campaignId } }),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["campaign-items", campaignId],
    queryFn: () => listItems({ data: { campaignId } }),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: ReviewItemRow | undefined = useMemo(
    () => items.find((i) => i.id === selectedId) ?? items[0],
    [items, selectedId],
  );
  const [notes, setNotes] = useState("");

  const decideMut = useMutation({
    mutationFn: (d: Decision) =>
      decide({ data: { item_id: selected!.id, decision: d, notes: notes || null } }),
    onSuccess: () => {
      toast.success("Decision recorded");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["campaign-items", campaignId] });
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const completeMut = useMutation({
    mutationFn: () => complete({ data: { id: campaignId } }),
    onSuccess: () => {
      toast.success("Campaign completed");
      qc.invalidateQueries({ queryKey: ["campaign", campaignId] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Cannot complete"),
  });

  if (!campaign) return (<PageShell><PageHeaderSkeleton /><DetailFormSkeleton /></PageShell>);
  const pct = campaign.total_items
    ? Math.round((campaign.decided_items / campaign.total_items) * 100)
    : 0;
  const allDecided = campaign.total_items > 0 && campaign.decided_items === campaign.total_items;

  return (
    <PageShell>
      <PageHeader
        backTo={{ to: "/reviews", label: "Reviews" }}
        title={campaign.name}
        meta={
          <>
            Due {format(new Date(campaign.due_at), "PP")} · Owner {campaign.owner?.full_name ?? "—"}
            {campaign.completed_at && (
              <> · Completed {format(new Date(campaign.completed_at), "PP")}</>
            )}
          </>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="flex w-56 items-center gap-2">
              <Progress value={pct} className="h-2" />
              <span className="w-16 text-right text-xs text-muted-foreground">
                {campaign.decided_items}/{campaign.total_items}
              </span>
            </div>
            {!campaign.completed_at && (
              <Button disabled={!allDecided || completeMut.isPending} onClick={() => completeMut.mutate()}>
                Mark complete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-5 p-0">
          <div className="max-h-[70vh] divide-y overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No grants in scope.</div>
            ) : items.map((it) => {
              const active = (selected?.id ?? items[0]?.id) === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => setSelectedId(it.id)}
                  className={cn(
                    "block w-full px-4 py-3 text-left hover:bg-muted/50",
                    active && "bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{it.grant?.person?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.grant?.system?.name ?? "—"} · {it.grant?.role_level}
                        {it.grant?.is_admin && " · admin"}
                      </div>
                    </div>
                    {it.decision && (
                      <Badge variant="outline" className="capitalize">{it.decision}</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="col-span-7">
          <CardContent className="space-y-4 p-6">
            {!selected ? (
              <p className="text-muted-foreground">Select an item.</p>
            ) : (
              <>
                <div>
                  <div className="text-lg font-semibold">{selected.grant?.person?.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selected.grant?.system?.name} · role <strong>{selected.grant?.role_level}</strong>
                    {selected.grant?.is_admin && " · admin"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Last used {selected.grant?.last_used_at ? format(new Date(selected.grant.last_used_at), "PP") : "never"}
                    {selected.grant?.last_reviewed_at && (
                      <> · Last reviewed {format(new Date(selected.grant.last_reviewed_at), "PP")}</>
                    )}
                  </div>
                </div>

                <Textarea
                  placeholder="Notes (optional)…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />

                <div className="flex flex-wrap gap-2">
                  {DECISIONS.map((d) => (
                    <Button
                      key={d}
                      variant={selected.decision === d ? "default" : "outline"}
                      onClick={() => decideMut.mutate(d)}
                      disabled={decideMut.isPending || !!campaign.completed_at}
                      className="capitalize"
                    >
                      {selected.decision === d && <Check className="mr-1 h-4 w-4" />}
                      {d}
                    </Button>
                  ))}
                </div>

                {selected.decided_at && (
                  <p className="text-xs text-muted-foreground">
                    Decided {format(new Date(selected.decided_at), "PP p")} by{" "}
                    {selected.reviewer?.full_name ?? selected.reviewer?.email ?? "—"}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Files</h2>
        <EvidenceFilesTab kind="access_review" linkedEntityType="campaign" linkedEntityId={campaignId} />
      </div>
    </PageShell>
  );
}
