import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBreach } from "@/lib/slas.functions";

import { errMessage } from "@/lib/utils";
const schema = z.object({
  occurred_at: z.string().min(1, "Required"),
  detected_at: z.string().optional(),
  impact_summary: z.string().trim().min(1, "Required").max(1000),
  remediation_notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function BreachForm({
  slaId, onSaved,
}: { slaId: string; onSaved?: () => void }) {
  const create = useServerFn(createBreach);
  const qc = useQueryClient();
  const now = new Date().toISOString().slice(0, 16);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { occurred_at: now, detected_at: "", impact_summary: "", remediation_notes: "" },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      create({
        data: {
          sla_id: slaId,
          occurred_at: new Date(v.occurred_at).toISOString(),
          detected_at: v.detected_at ? new Date(v.detected_at).toISOString() : null,
          impact_summary: v.impact_summary,
          status: "open" as const,
          remediation_notes: v.remediation_notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Breach logged");
      qc.invalidateQueries({ queryKey: ["breaches"] });
      qc.invalidateQueries({ queryKey: ["vendor-health"] });
      form.reset({ occurred_at: now, detected_at: "", impact_summary: "", remediation_notes: "" });
      onSaved?.();
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Occurred at</Label>
          <Input type="datetime-local" {...form.register("occurred_at")} />
          {form.formState.errors.occurred_at && (
            <p className="text-xs text-destructive">{form.formState.errors.occurred_at.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Detected at</Label>
          <Input type="datetime-local" {...form.register("detected_at")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Impact summary</Label>
        <Textarea rows={2} {...form.register("impact_summary")} />
        {form.formState.errors.impact_summary && (
          <p className="text-xs text-destructive">{form.formState.errors.impact_summary.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Remediation notes</Label>
        <Textarea rows={2} {...form.register("remediation_notes")} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>Log breach</Button>
      </div>
    </form>
  );
}
