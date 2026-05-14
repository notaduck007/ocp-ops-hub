import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { OwnerCombobox } from "@/components/owner-combobox";
import { SystemCombobox } from "@/components/access/system-combobox";
import { VendorCombobox } from "@/components/vendors/vendor-combobox";
import { useCurrentRole } from "@/hooks/use-auth";
import {
  RISK_KINDS,
  RISK_STATUSES,
  createRisk,
  updateRisk,
  type RiskRow,
} from "@/lib/risks.functions";

const formSchema = z.object({
  kind: z.enum(RISK_KINDS),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().optional().nullable(),
  severity: z.coerce.number().int().min(1).max(4),
  likelihood: z.coerce.number().int().min(1).max(4),
  status: z.enum(RISK_STATUSES),
  owner_id: z.string().uuid("Owner is required"),
  system_id: z.string().uuid().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  accepted_until: z.string().optional().nullable(),
  acceptance_justification: z.string().optional().nullable(),
  next_review_due_at: z.string().optional().nullable(),
  review_cadence_days: z.coerce.number().int().min(1).max(3650),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  mode: "create" | "edit";
  risk?: RiskRow;
  readOnly?: boolean;
  onSaved?: (id: string) => void;
};

export function RiskForm({ mode, risk, readOnly, onSaved }: Props) {
  const queryClient = useQueryClient();
  const { data: role } = useCurrentRole();
  const isAdmin = role === "admin";

  const create = useServerFn(createRisk);
  const update = useServerFn(updateRisk);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kind: (risk?.kind ?? "risk") as FormValues["kind"],
      title: risk?.title ?? "",
      description: risk?.description ?? "",
      severity: risk?.severity ?? 2,
      likelihood: risk?.likelihood ?? 2,
      status: (risk?.status ?? "open") as FormValues["status"],
      owner_id: risk?.owner_id ?? ("" as any),
      system_id: risk?.system_id ?? null,
      vendor_id: risk?.vendor_id ?? null,
      accepted_until: risk?.accepted_until ?? "",
      acceptance_justification: risk?.acceptance_justification ?? "",
      next_review_due_at: risk?.next_review_due_at
        ? new Date(risk.next_review_due_at).toISOString().slice(0, 10)
        : "",
      review_cadence_days: risk?.review_cadence_days ?? 90,
      notes: risk?.notes ?? "",
    },
  });

  const status = form.watch("status");
  const isAccepting = status === "accepted";

  const [submitting, setSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        description: values.description || null,
        notes: values.notes || null,
        accepted_until: isAccepting ? values.accepted_until || null : null,
        acceptance_justification: isAccepting
          ? values.acceptance_justification || null
          : null,
        next_review_due_at: values.next_review_due_at
          ? new Date(values.next_review_due_at).toISOString()
          : null,
      };
      if (mode === "create") return await create({ data: payload });
      return await update({ data: { id: risk!.id, patch: payload } });
    },
    onSuccess: (row) => {
      toast.success(mode === "create" ? "Risk created" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      queryClient.invalidateQueries({ queryKey: ["risk", row.id] });
      queryClient.invalidateQueries({ queryKey: ["risk-audit", row.id] });
      onSaved?.(row.id);
    },
    onError: (err: any) => toast.error(String(err?.message ?? err)),
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync(values);
    } finally {
      setSubmitting(false);
    }
  }

  // Status options visible to non-admins exclude accepted/closed.
  const statusOptions = isAdmin
    ? RISK_STATUSES
    : RISK_STATUSES.filter((s) => s !== "accepted" && s !== "closed");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kind</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RISK_KINDS.map((k) => (
                      <SelectItem key={k} value={k} className="capitalize">
                        {k}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isAdmin && (
                  <FormDescription>Only admins can mark a risk accepted or closed.</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} placeholder="Short risk statement" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} disabled={readOnly} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity (1-4)</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={readOnly}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
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
            name="likelihood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Likelihood (1-4)</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={readOnly}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
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
            name="review_cadence_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Review cadence (days)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} disabled={readOnly} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="owner_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <FormControl>
                <OwnerCombobox
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? "")}
                  disabled={readOnly}
                  selectedLabel={risk?.owner?.full_name || risk?.owner?.email || null}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="system_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked system</FormLabel>
                <FormControl>
                  <SystemCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    disabled={readOnly}
                    selectedLabel={risk?.system?.name ?? null}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vendor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked vendor</FormLabel>
                <FormControl>
                  <VendorCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="next_review_due_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next review due</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ""} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isAccepting && (
          <div className="space-y-4 rounded-md border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <p className="text-sm font-medium">Acceptance details (admin only)</p>
            <FormField
              control={form.control}
              name="accepted_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accepted until</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ""}
                      disabled={readOnly || !isAdmin}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptance_justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      disabled={readOnly || !isAdmin}
                      rows={3}
                      placeholder="Why is the residual risk acceptable?"
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} disabled={readOnly} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!readOnly && (
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={submitting || mutation.isPending}>
              {mutation.isPending
                ? "Saving…"
                : mode === "create"
                  ? "Create risk"
                  : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
