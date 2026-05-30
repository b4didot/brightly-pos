import { Trash2 } from "lucide-react";
import type { Item } from "../../types";
import { ModalFrame } from "./OrderUi";

export function RemoveItemModal({
  item,
  onClose,
  onConfirm,
}: {
  item: Item;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalFrame title="Remove Item" onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-sm font-semibold text-stone-700">
          Remove all <span className="font-bold text-stone-950">{item.name}</span> lines from the cart?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white transition hover:bg-red-700">
            <Trash2 size={17} />
            Remove
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
