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
import { OwnerCombobox } from "@/components/owner-combobox";
import {
  VENDOR_STATUSES,
  createVendor,
  updateVendor,
  type VendorRow,
} from "@/lib/vendors.functions";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  status: z.enum(VENDOR_STATUSES),
  website: z.string().trim().url().or(z.literal("")).optional(),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().trim().email().or(z.literal("")).optional(),
  escalation_contact_name: z.string().optional(),
  escalation_contact_email: z.string().trim().email().or(z.literal("")).optional(),
  contract_url: z.string().trim().url().or(z.literal("")).optional(),
  contract_end_at: z.string().optional(),
  renewal_window_days: z.coerce.number().int().min(0).max(3650),
  internal_owner_id: z.string().nullable().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function VendorForm({
  mode,
  vendor,
  readOnly,
  onSaved,
}: {
  mode: "create" | "edit";
  vendor?: VendorRow | null;
  readOnly?: boolean;
  onSaved?: (id: string) => void;
}) {
  const create = useServerFn(createVendor);
  const update = useServerFn(updateVendor);
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: vendor?.name ?? "",
      status: vendor?.status ?? "active",
      website: vendor?.website ?? "",
      primary_contact_name: vendor?.primary_contact_name ?? "",
      primary_contact_email: vendor?.primary_contact_email ?? "",
      escalation_contact_name: vendor?.escalation_contact_name ?? "",
      escalation_contact_email: vendor?.escalation_contact_email ?? "",
      contract_url: vendor?.contract_url ?? "",
      contract_end_at: vendor?.contract_end_at ?? "",
      renewal_window_days: vendor?.renewal_window_days ?? 60,
      internal_owner_id: vendor?.internal_owner_id ?? null,
      notes: vendor?.notes ?? "",
    },
  });

  useEffect(() => {
    if (vendor) form.reset({
      name: vendor.name, status: vendor.status,
      website: vendor.website ?? "",
      primary_contact_name: vendor.primary_contact_name ?? "",
      primary_contact_email: vendor.primary_contact_email ?? "",
      escalation_contact_name: vendor.escalation_contact_name ?? "",
      escalation_contact_email: vendor.escalation_contact_email ?? "",
      contract_url: vendor.contract_url ?? "",
      contract_end_at: vendor.contract_end_at ?? "",
      renewal_window_days: vendor.renewal_window_days,
      internal_owner_id: vendor.internal_owner_id ?? null,
      notes: vendor.notes ?? "",
    });
  }, [vendor]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = {
        ...values,
        contract_end_at: values.contract_end_at || null,
        internal_owner_id: values.internal_owner_id || null,
      };
      if (mode === "create") return create({ data: payload });
      return update({ data: { id: vendor!.id, patch: payload } });
    },
    onSuccess: (row: any) => {
      toast.success(mode === "create" ? "Vendor created" : "Vendor updated");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      qc.invalidateQueries({ queryKey: ["vendor", row.id] });
      onSaved?.(row.id);
    },
    onError: (err: unknown) => toast.error(errMessage(err)),
  });

  const disabled = readOnly || mutation.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input disabled={disabled} {...form.register("name")} />
        </Field>
        <Field label="Status">
          <Select
            value={form.watch("status")}
            onValueChange={(v) => form.setValue("status", v as any, { shouldDirty: true })}
            disabled={disabled}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VENDOR_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Website" error={form.formState.errors.website?.message}>
          <Input disabled={disabled} placeholder="https://…" {...form.register("website")} />
        </Field>
        <Field label="Internal owner">
          <OwnerCombobox
            value={form.watch("internal_owner_id") ?? null}
            onChange={(id) => form.setValue("internal_owner_id", id, { shouldDirty: true })}
            placeholder="Unassigned"
            disabled={disabled}
          />
        </Field>
        <Field label="Primary contact name">
          <Input disabled={disabled} {...form.register("primary_contact_name")} />
        </Field>
        <Field label="Primary contact email" error={form.formState.errors.primary_contact_email?.message}>
          <Input disabled={disabled} type="email" {...form.register("primary_contact_email")} />
        </Field>
        <Field label="Escalation contact name">
          <Input disabled={disabled} {...form.register("escalation_contact_name")} />
        </Field>
        <Field label="Escalation contact email" error={form.formState.errors.escalation_contact_email?.message}>
          <Input disabled={disabled} type="email" {...form.register("escalation_contact_email")} />
        </Field>
        <Field label="Contract URL" error={form.formState.errors.contract_url?.message}>
          <Input disabled={disabled} placeholder="https://…" {...form.register("contract_url")} />
        </Field>
        <Field label="Contract end">
          <Input disabled={disabled} type="date" {...form.register("contract_end_at")} />
        </Field>
        <Field label="Renewal window (days)">
          <Input disabled={disabled} type="number" min={0} {...form.register("renewal_window_days")} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea disabled={disabled} rows={3} {...form.register("notes")} />
      </Field>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mode === "create" ? "Create vendor" : "Save changes"}
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({
  label, children, error,
}: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
