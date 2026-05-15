import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerCombobox } from "@/components/owner-combobox";
import { SystemCombobox } from "@/components/access/system-combobox";
import {
  RUNBOOK_SCENARIOS,
  createRunbook,
  type RunbookScenario,
} from "@/lib/runbooks.functions";
import { useAuth } from "@/hooks/use-auth";
import { errMessage } from "@/lib/utils";

export function NewRunbookDialog({
  open,
  onOpenChange,
  defaultSystemId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSystemId?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createRunbook);

  const [systemId, setSystemId] = useState<string | null>(defaultSystemId ?? null);
  const [scenario, setScenario] = useState<RunbookScenario>("restore");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(user?.id ?? null);
  const [cadence, setCadence] = useState(365);

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          system_id: systemId!,
          scenario,
          title: title.trim(),
          body_md: body.trim(),
          owner_id: ownerId!,
          test_cadence_days: cadence,
        },
      }),
    onSuccess: (row: any) => {
      toast.success("Runbook created");
      qc.invalidateQueries({ queryKey: ["runbooks"] });
      onOpenChange(false);
      setTitle(""); setBody("");
      navigate({ to: "/runbooks/$runbookId", params: { runbookId: row.id } });
    },
    onError: (err: unknown) => toast.error(errMessage(err, "Failed")),
  });

  const can = systemId && title.trim() && body.trim() && ownerId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New runbook</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>System</Label>
              <SystemCombobox value={systemId} onChange={setSystemId} />
            </div>
            <div className="space-y-1.5">
              <Label>Scenario</Label>
              <Select value={scenario} onValueChange={(v) => setScenario(v as RunbookScenario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RUNBOOK_SCENARIOS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Restore GitHub org admin access"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Body (Markdown)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="font-mono text-sm"
              placeholder="## Steps&#10;1. ..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <OwnerCombobox value={ownerId} onChange={setOwnerId} />
            </div>
            <div className="space-y-1.5">
              <Label>Test cadence (days)</Label>
              <Input
                type="number"
                value={cadence}
                onChange={(e) => setCadence(Number(e.target.value) || 365)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!can || m.isPending} onClick={() => m.mutate()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
