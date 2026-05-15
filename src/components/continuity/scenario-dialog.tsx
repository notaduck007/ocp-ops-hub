import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OwnerCombobox } from "@/components/owner-combobox";
import { SystemMultiCombobox } from "@/components/incidents/system-multi-combobox";
import {
  upsertContinuityScenario,
  type ContinuityScenarioRow,
} from "@/lib/continuity.functions";
import { listRunbooks } from "@/lib/runbooks.functions";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export function ContinuityScenarioDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ContinuityScenarioRow | null;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const upsert = useServerFn(upsertContinuityScenario);
  const listRb = useServerFn(listRunbooks);

  const { data: runbooks = [] } = useQuery({
    queryKey: ["runbooks"],
    queryFn: () => listRb({ data: {} }),
    enabled: open,
  });

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [impact, setImpact] = useState("");
  const [auth, setAuth] = useState<string | null>(null);
  const [comms, setComms] = useState("");
  const [systems, setSystems] = useState<Array<{ id: string; name: string }>>([]);
  const [rbIds, setRbIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setTrigger(initial?.trigger_summary ?? "");
      setImpact(initial?.impact_summary ?? "");
      setAuth(initial?.decision_authority_user_id ?? null);
      setComms(initial?.comms_template_md ?? "");
      setSystems(initial?.linked_systems ?? []);
      setRbIds(initial?.linked_runbook_ids ?? []);
    }
  }, [open, initial]);

  const m = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: initial?.id,
          name: name.trim(),
          trigger_summary: trigger.trim() || null,
          impact_summary: impact.trim() || null,
          decision_authority_user_id: auth!,
          comms_template_md: comms.trim() || null,
          linked_system_ids: systems.map((s) => s.id),
          linked_runbook_ids: rbIds,
        },
      }),
    onSuccess: (row: any) => {
      toast.success(initial ? "Saved" : "Scenario created");
      qc.invalidateQueries({ queryKey: ["continuity"] });
      qc.invalidateQueries({ queryKey: ["continuity", row.id] });
      onOpenChange(false);
      if (!initial) navigate({ to: "/continuity/$scenarioId", params: { scenarioId: row.id } });
    },
    onError: (err: unknown) => toast.error(errMessage(err, "Failed")),
  });

  const can = name.trim() && auth;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit scenario" : "New continuity scenario"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Identity provider outage"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <Textarea value={trigger} onChange={(e) => setTrigger(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Impact</Label>
            <Textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Decision authority</Label>
            <OwnerCombobox value={auth} onChange={setAuth} />
          </div>
          <div className="space-y-1.5">
            <Label>Linked systems</Label>
            <SystemMultiCombobox value={systems} onChange={setSystems} />
          </div>
          <div className="space-y-1.5">
            <Label>Linked runbooks</Label>
            <div className="rounded border bg-card max-h-48 overflow-y-auto">
              {runbooks.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No runbooks available.</div>
              ) : (
                runbooks.map((r) => {
                  const checked = rbIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        setRbIds(checked ? rbIds.filter((x) => x !== r.id) : [...rbIds, r.id])
                      }
                      className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <Check className={`h-4 w-4 ${checked ? "opacity-100" : "opacity-0"}`} />
                        <span>{r.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">{r.scenario}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.system?.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Comms template (Markdown)</Label>
            <Textarea
              value={comms}
              onChange={(e) => setComms(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!can || m.isPending} onClick={() => m.mutate()}>
            {initial ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
