import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type EvidenceKind = Database["public"]["Enums"]["evidence_kind"];

export const EVIDENCE_LINK_KINDS: Record<string, EvidenceKind> = {
  incident: "incident",
  change: "change",
  policy: "policy",
  dr_test: "dr_test",
  campaign: "access_review",
  sla: "sla_review",
  risk: "risk_review",
  control: "control",
};

const ListInput = z.object({
  linked_entity_type: z.string().min(1),
  linked_entity_id: z.string().uuid(),
});

export const listEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("evidence_files")
      .select("*, uploader:users!evidence_files_uploaded_by_fkey(id,email,full_name)")
      .eq("linked_entity_type", data.linked_entity_type)
      .eq("linked_entity_id", data.linked_entity_id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const CreateInput = z.object({
  kind: z.enum([
    "access_review",
    "dr_test",
    "policy",
    "incident",
    "change",
    "sla_review",
    "risk_review",
    "control",
  ]),
  linked_entity_type: z.string().min(1),
  linked_entity_id: z.string().uuid(),
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  mime_type: z.string().nullable().optional(),
  size_bytes: z.number().int().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const createEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("evidence_files")
      .insert({
        kind: data.kind,
        linked_entity_type: data.linked_entity_type,
        linked_entity_id: data.linked_entity_id,
        bucket: "evidence",
        storage_path: data.storage_path,
        file_name: data.file_name,
        mime_type: data.mime_type ?? null,
        size_bytes: data.size_bytes ?? null,
        description: data.description ?? null,
        uploaded_by: userId,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "evidence.upload",
      _entity_type: data.linked_entity_type,
      _entity_id: data.linked_entity_id,
      _after: { file_name: data.file_name, storage_path: data.storage_path },
    });
    return row;
  });

export const getEvidenceSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("evidence_files")
      .select("bucket,storage_path,file_name")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: signed, error: sErr } = await supabase.storage
      .from(row.bucket)
      .createSignedUrl(row.storage_path, 60, { download: row.file_name });
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });
