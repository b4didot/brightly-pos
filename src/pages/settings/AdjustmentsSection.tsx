import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { usePosStore } from "../../store/usePosStore";
import type { Adjustment } from "../../types";
import { formatPeso, parsePesoInput } from "../../utils/money";
import { SettingRow } from "./SettingRow";

type AdjustmentModalState = { type: "add" } | { type: "edit" | "delete"; selectedId: string };

export function AdjustmentsSection() {
  const adjustments = usePosStore((state) => state.adjustments);
  const saveAdjustment = usePosStore((state) => state.saveAdjustment);
  const deleteAdjustment = usePosStore((state) => state.deleteAdjustment);
  const [editingAdjustment, setEditingAdjustment] = useState<Adjustment | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"percentage" | "flat">("percentage");
  const [value, setValue] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [modalState, setModalState] = useState<AdjustmentModalState | null>(null);

  const selectedAdjustment =
    modalState && "selectedId" in modalState
      ? adjustments.find((adjustment) => adjustment.id === modalState.selectedId)
      : null;

  function closeModal() {
    setModalState(null);
    resetForm();
  }

  function openAddModal() {
    resetForm();
    setModalState({ type: "add" });
  }

  function startEdit(adjustment: Adjustment) {
    setEditingAdjustment(adjustment);
    setLabel(adjustment.label);
    setType(adjustment.type);
    setValue(adjustment.type === "flat" ? String(adjustment.value / 100) : String(adjustment.value));
    setEnabled(adjustment.enabled);
    setModalState({ type: "edit", selectedId: adjustment.id });
  }

  function openDeleteModal(adjustmentId: string) {
    resetForm();
    setModalState({ type: "delete", selectedId: adjustmentId });
  }

  function resetForm() {
    setEditingAdjustment(null);
    setLabel("");
    setType("percentage");
    setValue("");
    setEnabled(true);
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!label.trim()) {
      return;
    }

    await saveAdjustment({
      id: editingAdjustment?.id,
      label,
      type,
      value: type === "flat" ? parsePesoInput(value) : Math.max(0, Number(value) || 0),
      enabled,
    });
    closeModal();
  }

  async function confirmDeleteAdjustment() {
    if (!selectedAdjustment) {
      return;
    }

    await deleteAdjustment(selectedAdjustment.id);
    closeModal();
  }

  return (
    <>
      <button type="button" onClick={openAddModal} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800 sm:w-auto">
        <Plus size={17} />
        Add Adjustment
      </button>
      <div className="mt-4 grid gap-2">
        {adjustments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            No automatic charges configured
          </p>
        ) : (
          adjustments.map((adjustment) => (
            <SettingRow
              key={adjustment.id}
              title={adjustment.label}
              detail={`${adjustment.enabled ? "Auto-applied" : "Disabled"} - ${
                adjustment.type === "flat" ? formatPeso(adjustment.value) : `${adjustment.value}%`
              }`}
              onEdit={() => startEdit(adjustment)}
              onDelete={() => openDeleteModal(adjustment.id)}
            />
          ))
        )}
      </div>

      <Modal isOpen={modalState?.type !== "delete" && Boolean(modalState)} onClose={closeModal} title={editingAdjustment ? "Edit Adjustment" : "Add Adjustment"}>
        <form onSubmit={(event) => void submitAdjustment(event)} className="grid gap-3">
          <input autoFocus value={label} onChange={(event) => setLabel(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700" placeholder="Tax, service charge, delivery fee" />
          <select value={type} onChange={(event) => setType(event.target.value as "percentage" | "flat")} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700">
            <option value="percentage">Percentage</option>
            <option value="flat">Flat amount</option>
          </select>
          <input type="number" min="0" step={type === "flat" ? "0.01" : "0.1"} value={value} onChange={(event) => setValue(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700" placeholder={type === "flat" ? "Amount" : "Percent"} />
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 font-semibold">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-amber-700" />
            Auto-apply
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white" type="submit">
              {editingAdjustment ? "Save Adjustment" : "Add Adjustment"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalState?.type === "delete"} onClose={closeModal} title="Delete Adjustment">
        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-700">
            Delete <span className="font-bold text-stone-950">{selectedAdjustment?.label}</span>? This charge will no
            longer be applied to new orders.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button type="button" onClick={() => void confirmDeleteAdjustment()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white transition hover:bg-red-700">
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
