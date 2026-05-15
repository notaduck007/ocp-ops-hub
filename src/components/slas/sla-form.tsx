import { useEffect } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VendorCombobox } from "@/components/vendors/vendor-combobox";
import { SystemCombobox } from "@/components/access/system-combobox";
import {
  SLA_TARGET_TYPES, createSla, updateSla, type SlaRow,
} from "@/lib/slas.functions";
import { errMessage } from "@/lib/utils";

const schema = z.object({
  vendor_id: z.string().uuid("Vendor required"),
  system_id: z.string().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  target_type: z.enum(SLA_TARGET_TYPES),
  target_value: z.coerce.number(),
  review_cadence_days: z.coerce.number().int().min(1).max(3650),
  last_reviewed_at: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function SlaForm({
  mode, sla, lockedVendorId, onSaved, readOnly,
}: {
  mode: "create" | "edit";
  sla?: SlaRow | null;
  lockedVendorId?: string;
  onSaved?: (id: string) => void;
  readOnly?: boolean;
}) {
  const create = useServerFn(createSla);
  const update = useServerFn(updateSla);
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor_id: sla?.vendor_id ?? lockedVendorId ?? "",
      system_id: sla?.system_id ?? null,
      name: sla?.name ?? "",
      target_type: sla?.target_type ?? "uptime_pct",
      target_value: sla ? Number(sla.target_value) : 99.9,
      review_cadence_days: sla?.review_cadence_days ?? 90,
      last_reviewed_at: sla?.last_reviewed_at ? sla.last_reviewed_at.slice(0, 10) : "",
      notes: sla?.notes ?? "",
    },
  });

  useEffect(() => {
    if (sla) form.reset({
      vendor_id: sla.vendor_id,
      system_id: sla.system_id,
      name: sla.name,
      target_type: sla.target_type,
      target_value: Number(sla.target_value),
      review_cadence_days: sla.review_cadence_days,
      last_reviewed_at: sla.last_reviewed_at ? sla.last_reviewed_at.slice(0, 10) : "",
      notes: sla.notes ?? "",
    });
  }, [sla]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        system_id: values.system_id || null,
        last_reviewed_at: values.last_reviewed_at ? new Date(values.last_reviewed_at).toISOString() : null,
      };
      if (mode === "create") return create({ data: payload });
      return update({ data: { id: sla!.id, patch: payload } });
    },
    onSuccess: (row) => {
      toast.success(mode === "create" ? "SLA created" : "SLA updated");
      qc.invalidateQueries({ queryKey: ["slas"] });
      qc.invalidateQueries({ queryKey: ["sla", row.id] });
      qc.invalidateQueries({ queryKey: ["vendor-slas"] });
      onSaved?.(row.id);
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  const disabled = readOnly || mutation.isPending;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Vendor" error={form.formState.errors.vendor_id?.message}>
          <VendorCombobox
            value={form.watch("vendor_id") || null}
            onChange={(id) => form.setValue("vendor_id", id ?? "", { shouldDirty: true })}
            disabled={disabled || !!lockedVendorId}
          />
        </Field>
        <Field label="System (optional)">
          <SystemCombobox
            value={form.watch("system_id") ?? null}
            onChange={(id) => form.setValue("system_id", id, { shouldDirty: true })}
            disabled={disabled}
            placeholder="Vendor-wide"
          />
        </Field>
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input disabled={disabled} placeholder="e.g. Production uptime" {...form.register("name")} />
        </Field>
        <Field label="Target type">
          <Select
            value={form.watch("target_type")}
            // RHF generic narrowing: Select gives `string`, RHF needs the literal union for this field.
            onValueChange={(v) => form.setValue("target_type", v as unknown as FormValues["target_type"], { shouldDirty: true })}
            disabled={disabled}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SLA_TARGET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Target value">
          <Input disabled={disabled} type="number" step="any" {...form.register("target_value")} />
        </Field>
        <Field label="Review cadence (days)">
          <Input disabled={disabled} type="number" min={1} {...form.register("review_cadence_days")} />
        </Field>
        <Field label="Last reviewed">
          <Input disabled={disabled} type="date" {...form.register("last_reviewed_at")} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea disabled={disabled} rows={3} {...form.register("notes")} />
      </Field>
      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mode === "create" ? "Create SLA" : "Save changes"}
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
