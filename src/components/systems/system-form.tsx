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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { OwnerCombobox } from "@/components/owner-combobox";
import {
  CRITICALITIES,
  DATA_CLASSES,
  SYSTEM_CATEGORIES,
  createSystem,
  updateSystem,
  type SystemRow,
} from "@/lib/systems.functions";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.enum(SYSTEM_CATEGORIES, { required_error: "Category is required" }),
  criticality: z.enum(CRITICALITIES),
  description: z.string().optional().nullable(),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .nullable()
    .optional(),
  business_owner_id: z.string().uuid().nullable().optional(),
  technical_owner_id: z.string().uuid().nullable().optional(),
  data_classes: z.array(z.enum(DATA_CLASSES)),
  mfa_required: z.boolean(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  mode: "create" | "edit";
  system?: SystemRow;
  readOnly?: boolean;
  onSaved?: (id: string) => void;
};

export function SystemForm({ mode, system, readOnly, onSaved }: Props) {
  const queryClient = useQueryClient();
  const create = useServerFn(createSystem);
  const update = useServerFn(updateSystem);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: system?.name ?? "",
      category: (system?.category ?? "other") as FormValues["category"],
      criticality: (system?.criticality ?? "medium") as FormValues["criticality"],
      description: system?.description ?? "",
      url: system?.url ?? "",
      business_owner_id: system?.business_owner_id ?? null,
      technical_owner_id: system?.technical_owner_id ?? null,
      data_classes: (system?.data_classes ?? []) as FormValues["data_classes"],
      mfa_required: system?.mfa_required ?? true,
      notes: system?.notes ?? "",
    },
  });

  const [submitting, setSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        url: values.url || null,
        description: values.description || null,
        notes: values.notes || null,
      };
      if (mode === "create") {
        return await create({ data: payload });
      }
      return await update({ data: { id: system!.id, patch: payload } });
    },
    onSuccess: (row) => {
      toast.success(mode === "create" ? "System created" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["system", row.id] });
      queryClient.invalidateQueries({ queryKey: ["system-audit", row.id] });
      onSaved?.(row.id);
    },
    onError: (err: unknown) => {
      const msg = errMessage(err);
      if (msg.includes("systems_name_key") || msg.toLowerCase().includes("duplicate")) {
        form.setError("name", { message: "A system with this name already exists." });
        toast.error("Name must be unique");
      } else {
        toast.error(msg);
      }
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await mutation.mutateAsync(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} placeholder="GitHub — OCP Org" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SYSTEM_CATEGORIES.map((c) => (
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
            name="criticality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Criticality</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={readOnly}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CRITICALITIES.map((c) => (
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
        </div>

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={readOnly}
                  placeholder="https://example.com"
                />
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
                <Textarea {...field} value={field.value ?? ""} disabled={readOnly} rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="business_owner_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business owner</FormLabel>
                <FormControl>
                  <OwnerCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    disabled={readOnly}
                    selectedLabel={
                      system?.business_owner?.full_name || system?.business_owner?.email || null
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="technical_owner_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Technical owner</FormLabel>
                <FormControl>
                  <OwnerCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    disabled={readOnly}
                    selectedLabel={
                      system?.technical_owner?.full_name || system?.technical_owner?.email || null
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="data_classes"
          render={() => (
            <FormItem>
              <FormLabel>Data classes</FormLabel>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {DATA_CLASSES.map((dc) => (
                  <FormField
                    key={dc}
                    control={form.control}
                    name="data_classes"
                    render={({ field }) => {
                      const checked = field.value?.includes(dc) ?? false;
                      return (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              disabled={readOnly}
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = new Set(field.value ?? []);
                                if (v) next.add(dc);
                                else next.delete(dc);
                                field.onChange(Array.from(next));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">{dc}</FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mfa_required"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <div>
                <FormLabel className="text-sm">MFA required</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Tracks whether multi-factor auth is enforced for this system.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={readOnly}
                />
              </FormControl>
            </FormItem>
          )}
        />

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
                  ? "Create system"
                  : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
