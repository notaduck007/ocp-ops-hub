import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SystemMultiCombobox } from "@/components/incidents/system-multi-combobox";
import { CHANGE_CLASSES, proposeChange } from "@/lib/changes.functions";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  class: z.enum(CHANGE_CLASSES),
  description: z.string().optional(),
  risk_summary: z.string().optional(),
  rollback_plan: z.string().trim().min(1, "Rollback plan is required").max(4000),
  comms_plan: z.string().optional(),
  scheduled_at: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProposeChangeDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const propose = useServerFn(proposeChange);
  const [systems, setSystems] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      class: "normal",
      description: "",
      risk_summary: "",
      rollback_plan: "",
      comms_plan: "",
      scheduled_at: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      propose({
        data: {
          title: values.title,
          class: values.class,
          description: values.description || null,
          risk_summary: values.risk_summary || null,
          rollback_plan: values.rollback_plan,
          comms_plan: values.comms_plan || null,
          scheduled_at: values.scheduled_at
            ? new Date(values.scheduled_at).toISOString()
            : null,
          system_ids: systems.map((s) => s.id),
        },
      }),
    onSuccess: (row) => {
      toast.success("Change proposed");
      qc.invalidateQueries({ queryKey: ["changes"] });
      onOpenChange(false);
      form.reset();
      setSystems([]);
      navigate({ to: "/changes/$changeId", params: { changeId: row.id } });
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Propose change</DialogTitle>
          <DialogDescription>
            Capture the proposal. An admin will review and approve.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Short description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANGE_CLASSES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduled_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Affected systems</label>
              <SystemMultiCombobox value={systems} onChange={setSystems} />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="risk_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk summary</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rollback_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Rollback plan <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="How will we revert this if it goes wrong?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comms_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comms plan</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Submitting…" : "Propose change"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
