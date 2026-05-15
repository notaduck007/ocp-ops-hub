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
import {
  PERSON_STATUSES,
  PERSON_TYPES,
  createPerson,
  updatePerson,
  type PersonRow,
} from "@/lib/people.functions";

const formSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().email("Must be a valid email").or(z.literal("")).nullable().optional(),
  type: z.enum(PERSON_TYPES, { required_error: "Type is required" }),
  status: z.enum(PERSON_STATUSES),
  employer: z.string().nullable().optional(),
  employment_start: z.string().nullable().optional(),
  employment_end: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  mode: "create" | "edit";
  person?: PersonRow;
  readOnly?: boolean;
  onSaved?: (id: string) => void;
};

export function PersonForm({ mode, person, readOnly, onSaved }: Props) {
  const queryClient = useQueryClient();
  const create = useServerFn(createPerson);
  const update = useServerFn(updatePerson);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: person?.full_name ?? "",
      email: person?.email ?? "",
      type: (person?.type ?? "staff") as FormValues["type"],
      status: (person?.status ?? "active") as FormValues["status"],
      employer: person?.employer ?? "",
      employment_start: person?.employment_start ?? "",
      employment_end: person?.employment_end ?? "",
      notes: person?.notes ?? "",
    },
  });

  const [submitting, setSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        email: values.email || null,
        employer: values.employer || null,
        employment_start: values.employment_start || null,
        employment_end: values.employment_end || null,
        notes: values.notes || null,
      };
      if (mode === "create") return await create({ data: payload });
      return await update({ data: { id: person!.id, patch: payload } });
    },
    onSuccess: (row) => {
      toast.success(mode === "create" ? "Person created" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["person", row.id] });
      queryClient.invalidateQueries({ queryKey: ["person-audit", row.id] });
      onSaved?.(row.id);
    },
    onError: (err: unknown) => {
      const msg = errMessage(err);
      if (msg.includes("people_email_key") || msg.toLowerCase().includes("duplicate")) {
        form.setError("email", { message: "A person with this email already exists." });
        toast.error("Email must be unique");
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} placeholder="Jane Doe" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={readOnly}
                  placeholder="jane@example.com"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PERSON_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t.replace("_", " ")}
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
                    {PERSON_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
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
          name="employer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employer</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={readOnly}
                  placeholder="Acme Corp (for contractors / vendor users)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="employment_start"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment start</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employment_end"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment end</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
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
                  ? "Create person"
                  : "Save changes"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
