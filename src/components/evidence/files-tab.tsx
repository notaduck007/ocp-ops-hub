import { useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { Upload, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useCanEdit } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import {
  listEvidence,
  createEvidence,
  getEvidenceSignedUrl,
  type EvidenceKind,
} from "@/lib/evidence.functions";

type Props = {
  kind: EvidenceKind;
  linkedEntityType: string;
  linkedEntityId: string;
};

export function EvidenceFilesTab({
  kind,
  linkedEntityType,
  linkedEntityId,
}: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canUpload = useCanEdit();

  const list = useServerFn(listEvidence);
  const create = useServerFn(createEvidence);
  const sign = useServerFn(getEvidenceSignedUrl);

  const queryKey = ["evidence", linkedEntityType, linkedEntityId];

  const { data: files = [] } = useQuery({
    queryKey,
    queryFn: () =>
      list({
        data: {
          linked_entity_type: linkedEntityType,
          linked_entity_id: linkedEntityId,
        },
      }),
  });

  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      setProgress(5);
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const path = `${linkedEntityType}/${linkedEntityId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("evidence")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw new Error(upErr.message);
      setProgress(70);
      await create({
        data: {
          kind,
          linked_entity_type: linkedEntityType,
          linked_entity_id: linkedEntityId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
        },
      });
      setProgress(100);
    },
    onSuccess: () => {
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey });
      setTimeout(() => setProgress(null), 600);
    },
    onError: (err: unknown) => {
      toast.error(errMessage(err));
      setProgress(null);
    },
  });

  const handleFiles = useCallback(
    (fl: FileList | null) => {
      if (!fl || fl.length === 0) return;
      Array.from(fl).forEach((f) => uploadMutation.mutate(f));
    },
    [uploadMutation],
  );

  const onDownload = async (id: string) => {
    try {
      const { url } = await sign({ data: { id } });
      window.open(url, "_blank");
    } catch (err: unknown) {
      toast.error(errMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 bg-card"
          }`}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-muted-foreground">
            Drag &amp; drop files here, or
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Uploading…
              </>
            ) : (
              "Browse files"
            )}
          </Button>
          {progress !== null && (
            <div className="mt-2 w-full max-w-xs">
              <Progress value={progress} />
            </div>
          )}
        </div>
      )}

      {files.length === 0 ? (
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
          No files attached yet.
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Uploaded by</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {files.map((f: any) => (
                <tr key={f.id}>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onDownload(f.id)}
                      className="flex items-center gap-2 text-left hover:underline"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {f.file_name}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {f.size_bytes
                      ? `${(f.size_bytes / 1024).toFixed(1)} KB`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {f.uploader?.full_name ?? f.uploader?.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {format(new Date(f.created_at), "PP p")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
