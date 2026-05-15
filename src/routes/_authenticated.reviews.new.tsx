import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { listSystems } from "@/lib/systems.functions";
import {
  createCampaign,
  previewCampaignScope,
} from "@/lib/reviews.functions";
import { errMessage } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reviews/new")({
  component: NewCampaignWizard,
});

function NewCampaignWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("Quarterly access review");
  const [systemIds, setSystemIds] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));

  const sysFn = useServerFn(listSystems);
  const previewFn = useServerFn(previewCampaignScope);
  const createFn = useServerFn(createCampaign);

  const { data: systems = [] } = useQuery({
    queryKey: ["systems"],
    queryFn: () => sysFn({ data: { includeArchived: false } }),
  });

  const { data: preview } = useQuery({
    queryKey: ["campaign-preview", systemIds],
    queryFn: () => previewFn({ data: { system_ids: systemIds } }),
    enabled: step === 3,
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name,
          scope_system_ids: systemIds,
          due_at: dueAt,
          notes: null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Campaign created with ${res.items} items`);
      navigate({ to: "/reviews/$campaignId", params: { campaignId: res.id } });
    },
    onError: (err: unknown) => toast.error(errMessage(err, "Failed")),
  });

  const toggleSys = (id: string) =>
    setSystemIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: "/reviews" })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New access review</h1>
        <p className="text-sm text-muted-foreground">Step {step} of 3</p>
      </div>

      {step === 1 && (
        <Card><CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>Campaign name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Scope (leave empty for all systems)</Label>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded border p-3">
              {systems.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={systemIds.includes(s.id)} onCheckedChange={() => toggleSys(s.id)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemIds.length === 0 ? "All systems" : `${systemIds.length} selected`}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!name.trim()}>Next</Button>
          </div>
        </CardContent></Card>
      )}

      {step === 2 && (
        <Card><CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Next</Button>
          </div>
        </CardContent></Card>
      )}

      {step === 3 && (
        <Card><CardContent className="space-y-4 p-6">
          <h2 className="font-medium">Confirm</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd>{name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Scope</dt><dd>{systemIds.length === 0 ? "All systems" : `${systemIds.length} systems`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Due</dt><dd>{format(new Date(dueAt), "PP")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Items to review</dt><dd className="font-medium">{preview?.count ?? "…"}</dd></div>
          </dl>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>Create campaign</Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
