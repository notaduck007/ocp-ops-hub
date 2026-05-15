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
import { declareIncident } from "@/lib/incidents.functions";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  severity: z.coerce.number().int().min(1).max(4),
  impact_summary: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeclareIncidentDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const declare = useServerFn(declareIncident);
  const [systems, setSystems] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", severity: 3, impact_summary: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      declare({
        data: {
          title: values.title,
          severity: values.severity,
          impact_summary: values.impact_summary || null,
          system_ids: systems.map((s) => s.id),
        },
      }),
    onSuccess: (row) => {
      toast.success("Incident declared");
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["dash"] });
      onOpenChange(false);
      form.reset();
      setSystems([]);
      navigate({
        to: "/incidents/$incidentId",
        params: { incidentId: row.id },
      });
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Declare incident</DialogTitle>
          <DialogDescription>
            Capture the basics now. You can fill in more on the detail page.
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
                    <Input
                      {...field}
                      placeholder="Short description of the incident"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Sev 1 — Low</SelectItem>
                      <SelectItem value="2">Sev 2 — Medium</SelectItem>
                      <SelectItem value="3">Sev 3 — High</SelectItem>
                      <SelectItem value="4">Sev 4 — Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Affected systems</label>
              <SystemMultiCombobox value={systems} onChange={setSystems} />
            </div>
            <FormField
              control={form.control}
              name="impact_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impact summary</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Who/what is affected?"
                    />
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
                {mutation.isPending ? "Declaring…" : "Declare incident"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
