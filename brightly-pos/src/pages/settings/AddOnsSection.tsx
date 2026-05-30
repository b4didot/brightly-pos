import { Link2, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { usePosStore } from "../../store/usePosStore";
import type { Item } from "../../types";
import { formatPeso, parsePesoInput } from "../../utils/money";
import { SettingRow } from "./SettingRow";

type AddOnModalState =
  | { type: "add" }
  | { type: "edit" | "delete" | "link"; selectedId: string };

export function AddOnsSection() {
  const items = usePosStore((state) => state.items);
  const itemAddOns = usePosStore((state) => state.itemAddOns);
  const saveAddOnItem = usePosStore((state) => state.saveAddOnItem);
  const deleteItem = usePosStore((state) => state.deleteItem);
  const linkAddOnToItem = usePosStore((state) => state.linkAddOnToItem);
  const unlinkAddOnFromItem = usePosStore((state) => state.unlinkAddOnFromItem);
  const [editingAddOn, setEditingAddOn] = useState<Item | null>(null);
  const [addOnName, setAddOnName] = useState("");
  const [addOnPrice, setAddOnPrice] = useState("");
  const [modalState, setModalState] = useState<AddOnModalState | null>(null);

  const addOnItems = items.filter((item) => item.isAddOn);
  const regularItems = items.filter((item) => !item.isAddOn);
  const selectedAddOn =
    modalState && "selectedId" in modalState ? items.find((item) => item.id === modalState.selectedId) : null;

  function resetForm() {
    setEditingAddOn(null);
    setAddOnName("");
    setAddOnPrice("");
  }

  function closeModal() {
    setModalState(null);
    resetForm();
  }

  function openAddModal() {
    resetForm();
    setModalState({ type: "add" });
  }

  function startEdit(addOn: Item) {
    setEditingAddOn(addOn);
    setAddOnName(addOn.name);
    setAddOnPrice(String(addOn.price / 100));
    setModalState({ type: "edit", selectedId: addOn.id });
  }

  function openLinkModal(addOnId: string) {
    resetForm();
    setModalState({ type: "link", selectedId: addOnId });
  }

  function openDeleteModal(addOnId: string) {
    resetForm();
    setModalState({ type: "delete", selectedId: addOnId });
  }

  async function submitAddOn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!addOnName.trim() || !addOnPrice) {
      return;
    }

    await saveAddOnItem({
      id: editingAddOn?.id,
      name: addOnName,
      price: parsePesoInput(addOnPrice),
    });
    closeModal();
  }

  async function confirmDelete() {
    if (!selectedAddOn) {
      return;
    }

    await deleteItem(selectedAddOn.id);
    closeModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={openAddModal}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800 sm:w-auto"
      >
        <Plus size={17} />
        Add Add-on
      </button>

      <div className="mt-4 grid gap-2">
        {addOnItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            No add-ons yet
          </p>
        ) : (
          addOnItems.map((addOn) => {
            const linkedCount = itemAddOns.filter((itemAddOn) => itemAddOn.addOnItemId === addOn.id).length;

            return (
              <SettingRow
                key={addOn.id}
                title={addOn.name}
                detail={`${formatPeso(addOn.price)} - linked to ${linkedCount} item${linkedCount === 1 ? "" : "s"}`}
                aside={
                  <button
                    type="button"
                    onClick={() => openLinkModal(addOn.id)}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold"
                  >
                    <Link2 size={15} />
                    Link
                  </button>
                }
                onEdit={() => startEdit(addOn)}
                onDelete={() => openDeleteModal(addOn.id)}
              />
            );
          })
        )}
      </div>

      <Modal
        isOpen={modalState?.type !== "delete" && modalState?.type !== "link" && Boolean(modalState)}
        onClose={closeModal}
        title={editingAddOn ? "Edit Add-on" : "Add Add-on"}
      >
        <form onSubmit={(event) => void submitAddOn(event)} className="grid gap-3">
          <input
            autoFocus
            value={addOnName}
            onChange={(event) => setAddOnName(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="Add-on name"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={addOnPrice}
            onChange={(event) => setAddOnPrice(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="Price"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button type="submit" className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white">
              {editingAddOn ? "Save" : "Add Add-on"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalState?.type === "link"} onClose={closeModal} title={`Link ${selectedAddOn?.name ?? "Add-on"}`}>
        {regularItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            Add regular items first
          </p>
        ) : (
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {regularItems.map((item) => {
              const isLinked = itemAddOns.some(
                (itemAddOn) => itemAddOn.itemId === item.id && itemAddOn.addOnItemId === selectedAddOn?.id,
              );

              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{item.name}</span>
                    <span className="block truncate text-sm text-stone-500">{formatPeso(item.price)}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isLinked}
                    disabled={!selectedAddOn}
                    onChange={() =>
                      void (selectedAddOn &&
                        (isLinked
                          ? unlinkAddOnFromItem(item.id, selectedAddOn.id)
                          : linkAddOnToItem(item.id, selectedAddOn.id)))
                    }
                    className="h-5 w-5 shrink-0 accent-amber-700"
                  />
                </label>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal isOpen={modalState?.type === "delete"} onClose={closeModal} title="Delete Add-on">
        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-700">
            Delete <span className="font-bold text-stone-950">{selectedAddOn?.name}</span>? This add-on will be unlinked
            from all items.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white hover:bg-red-700"
            >
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
