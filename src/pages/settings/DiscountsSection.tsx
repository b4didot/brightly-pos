import { BadgePercent, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { usePosStore } from "../../store/usePosStore";
import type { DiscountTemplate } from "../../types";
import { formatPeso, parsePesoInput } from "../../utils/money";
import { SettingRow } from "./SettingRow";
import { ToggleRow } from "./ToggleRow";

type DiscountModalState = { type: "add" } | { type: "edit" | "delete"; selectedId: string };

function formatDiscountValue(discount: Pick<DiscountTemplate, "type" | "value">) {
  return discount.type === "flat" ? formatPeso(discount.value) : `${discount.value}%`;
}

export function DiscountsSection() {
  const discountTemplates = usePosStore((state) => state.discountTemplates);
  const settings = usePosStore((state) => state.settings);
  const setDiscountsEnabled = usePosStore((state) => state.setDiscountsEnabled);
  const saveDiscountTemplate = usePosStore((state) => state.saveDiscountTemplate);
  const deleteDiscountTemplate = usePosStore((state) => state.deleteDiscountTemplate);
  const [editingDiscount, setEditingDiscount] = useState<DiscountTemplate | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"percentage" | "flat">("percentage");
  const [value, setValue] = useState("");
  const [modalState, setModalState] = useState<DiscountModalState | null>(null);

  const selectedDiscount =
    modalState && "selectedId" in modalState
      ? discountTemplates.find((discount) => discount.id === modalState.selectedId)
      : null;

  function closeModal() {
    setModalState(null);
    resetForm();
  }

  function openAddModal() {
    resetForm();
    setModalState({ type: "add" });
  }

  function startEdit(discount: DiscountTemplate) {
    setEditingDiscount(discount);
    setLabel(discount.label);
    setType(discount.type);
    setValue(discount.type === "flat" ? String(discount.value / 100) : String(discount.value));
    setModalState({ type: "edit", selectedId: discount.id });
  }

  function openDeleteModal(discountId: string) {
    resetForm();
    setModalState({ type: "delete", selectedId: discountId });
  }

  function resetForm() {
    setEditingDiscount(null);
    setLabel("");
    setType("percentage");
    setValue("");
  }

  async function submitDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!label.trim()) {
      return;
    }

    await saveDiscountTemplate({
      id: editingDiscount?.id,
      label,
      type,
      value: type === "flat" ? parsePesoInput(value) : Math.max(0, Number(value) || 0),
    });
    closeModal();
  }

  async function confirmDeleteDiscount() {
    if (!selectedDiscount) {
      return;
    }

    await deleteDiscountTemplate(selectedDiscount.id);
    closeModal();
  }

  return (
    <>
      <div className="grid gap-3">
        <ToggleRow
          checked={settings.discountEnabled}
          disabled={false}
          icon={<BadgePercent size={20} />}
          label="Enable checkout discounts"
          onChange={(checked) => void setDiscountsEnabled(checked)}
        />

        <button type="button" onClick={openAddModal} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800">
          <Plus size={17} />
          Add Discount Template
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {discountTemplates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            No discount templates configured
          </p>
        ) : (
          discountTemplates.map((discount) => (
            <SettingRow
              key={discount.id}
              title={discount.label}
              detail={formatDiscountValue(discount)}
              onEdit={() => startEdit(discount)}
              onDelete={() => openDeleteModal(discount.id)}
            />
          ))
        )}
      </div>

      <Modal isOpen={modalState?.type !== "delete" && Boolean(modalState)} onClose={closeModal} title={editingDiscount ? "Edit Discount Template" : "Add Discount Template"}>
        <form onSubmit={(event) => void submitDiscount(event)} className="grid gap-3">
          <input autoFocus value={label} onChange={(event) => setLabel(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700" placeholder="Senior discount, promo discount" />
          <select value={type} onChange={(event) => setType(event.target.value as "percentage" | "flat")} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700">
            <option value="percentage">Percentage</option>
            <option value="flat">Flat amount</option>
          </select>
          <input type="number" min="0" step={type === "flat" ? "0.01" : "0.1"} value={value} onChange={(event) => setValue(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700" placeholder={type === "flat" ? "Amount" : "Percent"} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white" type="submit">
              {editingDiscount ? "Save Template" : "Add Template"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalState?.type === "delete"} onClose={closeModal} title="Delete Discount Template">
        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-700">
            Delete <span className="font-bold text-stone-950">{selectedDiscount?.label}</span>? It will no longer be available during checkout.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button type="button" onClick={() => void confirmDeleteDiscount()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white transition hover:bg-red-700">
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
