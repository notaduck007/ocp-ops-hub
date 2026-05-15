import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
import { errMessage } from "@/lib/utils";
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
import { SystemCombobox } from "@/components/access/system-combobox";
import {
  ACCESS_ROLE_LEVELS,
  createAccessGrant,
  updateAccessGrant,
  type AccessGrantRow,
} from "@/lib/people.functions";

const formSchema = z.object({
  system_id: z.string().uuid({ message: "System is required" }),
  role_level: z.enum(ACCESS_ROLE_LEVELS),
  is_admin: z.boolean(),
  granted_at: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  personId: string;
  grant?: AccessGrantRow & { system?: { id: string; name: string } | null };
  onSaved?: () => void;
  onCancel?: () => void;
};

export function AccessGrantForm({ personId, grant, onSaved, onCancel }: Props) {
  const queryClient = useQueryClient();
  const create = useServerFn(createAccessGrant);
  const update = useServerFn(updateAccessGrant);
  const isEdit = !!grant;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      system_id: grant?.system_id ?? "",
      role_level: (grant?.role_level ?? "read") as FormValues["role_level"],
      is_admin: grant?.is_admin ?? false,
      granted_at: grant?.granted_at ?? "",
      source: grant?.source ?? "manual",
      notes: grant?.notes ?? "",
    },
  });

  const [submitting, setSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        granted_at: values.granted_at || null,
        source: values.source || null,
        notes: values.notes || null,
      };
      if (isEdit) return await update({ data: { id: grant!.id, patch: payload } });
      return await create({ data: { ...payload, person_id: personId } });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Access updated" : "Access granted");
      queryClient.invalidateQueries({ queryKey: ["access-grants"] });
      onSaved?.();
    },
    onError: (err: unknown) => {
      const msg = errMessage(err);
      if (msg.toLowerCase().includes("duplicate") || msg.includes("access_grants_person_id")) {
        toast.error("This person already has that role on this system.");
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="system_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System</FormLabel>
              <FormControl>
                <SystemCombobox
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? "")}
                  selectedLabel={grant?.system?.name ?? null}
                  disabled={isEdit}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="role_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role level</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCESS_ROLE_LEVELS.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
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
            name="granted_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Granted on</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_admin"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <div>
                <FormLabel className="text-sm">Admin on this system</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Mark privileged accounts (org owner, billing admin, etc.).
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="manual / import / integration:github"
                />
              </FormControl>
              <FormMessage />
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
                <Textarea {...field} value={field.value ?? ""} rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting || mutation.isPending}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save" : "Grant access"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
