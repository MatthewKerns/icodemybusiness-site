import { X, Paperclip } from "lucide-react";
import type { AttachedFile } from "./types";

interface Props {
  file: AttachedFile;
  onRemove?: (storageId: string) => void;
}

export function FileAttachmentChip({ file, onRemove }: Props) {
  const kb = Math.round(file.size / 1024);
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs"
      data-testid="file-chip"
    >
      <Paperclip className="h-3 w-3 text-gold" />
      <span className="truncate max-w-[140px]" title={file.name}>
        {file.name}
      </span>
      <span className="text-text-muted">{kb}KB</span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(file.storageId)}
          aria-label={`Remove ${file.name}`}
          className="text-text-muted hover:text-text-primary"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
