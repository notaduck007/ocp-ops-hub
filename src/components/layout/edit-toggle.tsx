import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EditToggleProps {
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  /** Optional explicit done handler. If omitted, "Done" calls onCancel (forms save themselves). */
  onDone?: () => void;
  editLabel?: string;
  doneLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
}

export function EditToggle({
  editing,
  onEdit,
  onCancel,
  onDone,
  editLabel = "Edit",
  doneLabel = "Done",
  cancelLabel = "Cancel",
  disabled,
}: EditToggleProps) {
  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={onEdit} disabled={disabled}>
        <Pencil className="mr-2 h-4 w-4" />
        {editLabel}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>
        <X className="mr-2 h-4 w-4" />
        {cancelLabel}
      </Button>
      {onDone && (
        <Button size="sm" onClick={onDone} disabled={disabled}>
          <Check className="mr-2 h-4 w-4" />
          {doneLabel}
        </Button>
      )}
    </div>
  );
}
