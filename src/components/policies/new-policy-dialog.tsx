import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import {
import { errMessage } from "@/lib/utils";
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
import { createPolicy } from "@/lib/policies.functions";
import { useAuth } from "@/hooks/use-auth";

export function NewPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createPolicy);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(user?.id ?? null);
  const [cadence, setCadence] = useState(365);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          title: title.trim(),
          body_md: body.trim(),
          owner_id: ownerId!,
          review_cadence_days: cadence,
        },
      }),
    onSuccess: (row: any) => {
      toast.success("Draft policy created");
      qc.invalidateQueries({ queryKey: ["policies"] });
      onOpenChange(false);
      setTitle("");
      setBody("");
      navigate({ to: "/policies/$policyId", params: { policyId: row.id } });
    },
    onError: (err: unknown) => toast.error(errMessage(err, "Failed to create policy")),
  });

  const canSubmit = title.trim() && body.trim() && ownerId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Incident Response Policy" />
          </div>
          <div className="space-y-1.5">
            <Label>Body (Markdown)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="## Purpose&#10;..."
              className="font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <OwnerCombobox value={ownerId} onChange={setOwnerId} />
            </div>
            <div className="space-y-1.5">
              <Label>Review cadence (days)</Label>
              <Input
                type="number"
                value={cadence}
                onChange={(e) => setCadence(Number(e.target.value) || 365)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
