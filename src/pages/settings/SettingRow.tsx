import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export function SettingRow({
  aside,
  detail,
  onDelete,
  onEdit,
  status,
  swatch,
  title,
}: {
  aside?: ReactNode;
  detail: string;
  onDelete: () => void;
  onEdit: () => void;
  status?: string;
  swatch?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {swatch && (
          <span className="h-9 w-9 shrink-0 rounded-lg border border-black/10" style={{ backgroundColor: swatch }} />
        )}
        <div className="min-w-0">
          <p className="truncate font-bold">{title}</p>
          <p className="truncate text-sm text-stone-500">
            {detail}
            {status ? <span className="font-semibold text-amber-800"> - {status}</span> : null}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:flex sm:shrink-0">
        {aside}
        <button type="button" onClick={onEdit} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold">
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="grid h-10 w-10 place-items-center rounded-lg border border-red-100 text-red-600"
          aria-label={`Delete ${title}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
