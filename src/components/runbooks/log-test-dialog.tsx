import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import {
  DR_TEST_RESULTS,
  logDrTest,
  type DrTestResult,
} from "@/lib/runbooks.functions";
import { useAuth } from "@/hooks/use-auth";
import { errMessage } from "@/lib/utils";

export function LogTestDialog({
  open,
  onOpenChange,
  runbookId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  runbookId: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const log = useServerFn(logDrTest);

  const [performedAt, setPerformedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [performedById, setPerformedById] = useState<string | null>(user?.id ?? null);
  const [result, setResult] = useState<DrTestResult>("pass");
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [remediation, setRemediation] = useState("");

  const m = useMutation({
    mutationFn: () =>
      log({
        data: {
          runbook_id: runbookId,
          performed_at: new Date(performedAt).toISOString(),
          performed_by_id: performedById!,
          result,
          duration_minutes: duration ? Number(duration) : null,
          notes_md: notes.trim() || null,
          remediation_items: remediation.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Test logged");
      qc.invalidateQueries({ queryKey: ["dr-tests", runbookId] });
      qc.invalidateQueries({ queryKey: ["runbook", runbookId] });
      qc.invalidateQueries({ queryKey: ["runbooks"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => toast.error(errMessage(err, "Failed")),
  });

  const can = performedAt && performedById && result;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Log DR test</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Performed at</Label>
              <Input
                type="datetime-local"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Result</Label>
              <Select value={result} onValueChange={(v) => setResult(v as DrTestResult)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DR_TEST_RESULTS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Performed by</Label>
              <OwnerCombobox value={performedById} onChange={setPerformedById} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label>Remediation items</Label>
            <Textarea
              value={remediation}
              onChange={(e) => setRemediation(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!can || m.isPending} onClick={() => m.mutate()}>Log test</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
