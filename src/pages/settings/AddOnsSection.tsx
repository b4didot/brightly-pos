import { Link2, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { categoryFallback } from "../../constants/catalog";
import { usePosStore } from "../../store/usePosStore";
import type { Item } from "../../types";
import { formatPeso, parsePesoInput } from "../../utils/money";
import { SettingRow } from "./SettingRow";

type AddOnModalState =
  | { type: "add" }
  | { type: "edit" | "delete" | "link"; selectedId: string };

export function AddOnsSection() {
  const categories = usePosStore((state) => state.categories);
  const items = usePosStore((state) => state.items);
  const itemAddOns = usePosStore((state) => state.itemAddOns);
  const saveAddOnItem = usePosStore((state) => state.saveAddOnItem);
  const deleteItem = usePosStore((state) => state.deleteItem);
  const linkAddOnToItem = usePosStore((state) => state.linkAddOnToItem);
  const unlinkAddOnFromItem = usePosStore((state) => state.unlinkAddOnFromItem);
  const [editingAddOn, setEditingAddOn] = useState<Item | null>(null);
  const [addOnName, setAddOnName] = useState("");
  const [addOnPrice, setAddOnPrice] = useState("");
  const [linkCategoryId, setLinkCategoryId] = useState("all");
  const [modalState, setModalState] = useState<AddOnModalState | null>(null);

  const addOnItems = items.filter((item) => item.isAddOn);
  const regularItems = items.filter((item) => !item.isAddOn);
  const hasUncategorized = regularItems.some((item) => !item.categoryId);
  const filteredRegularItems = regularItems.filter((item) => {
    if (linkCategoryId === "all") return true;
    if (linkCategoryId === "uncategorized") return !item.categoryId;
    return item.categoryId === linkCategoryId;
  });
  const selectedAddOn =
    modalState && "selectedId" in modalState ? items.find((item) => item.id === modalState.selectedId) : null;
  const hasUnlinkedVisibleItems = Boolean(
    selectedAddOn &&
      filteredRegularItems.some(
        (item) =>
          !itemAddOns.some((itemAddOn) => itemAddOn.itemId === item.id && itemAddOn.addOnItemId === selectedAddOn.id),
      ),
  );
  const hasLinkedVisibleItems = Boolean(
    selectedAddOn &&
      filteredRegularItems.some((item) =>
        itemAddOns.some((itemAddOn) => itemAddOn.itemId === item.id && itemAddOn.addOnItemId === selectedAddOn.id),
      ),
  );
  const visibleLinkedCount = selectedAddOn
    ? filteredRegularItems.filter((item) =>
        itemAddOns.some((itemAddOn) => itemAddOn.itemId === item.id && itemAddOn.addOnItemId === selectedAddOn.id),
      ).length
    : 0;

  function resetForm() {
    setEditingAddOn(null);
    setAddOnName("");
    setAddOnPrice("");
    setLinkCategoryId("all");
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

  async function linkVisibleItems() {
    if (!selectedAddOn) {
      return;
    }

    for (const item of filteredRegularItems) {
      const isLinked = itemAddOns.some(
        (itemAddOn) => itemAddOn.itemId === item.id && itemAddOn.addOnItemId === selectedAddOn.id,
      );

      if (!isLinked) {
        await linkAddOnToItem(item.id, selectedAddOn.id);
      }
    }
  }

  async function unlinkVisibleItems() {
    if (!selectedAddOn) {
      return;
    }

    for (const item of filteredRegularItems) {
      const isLinked = itemAddOns.some(
        (itemAddOn) => itemAddOn.itemId === item.id && itemAddOn.addOnItemId === selectedAddOn.id,
      );

      if (isLinked) {
        await unlinkAddOnFromItem(item.id, selectedAddOn.id);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openAddModal}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800"
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
          <div className="grid gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setLinkCategoryId("all")}
                className={`min-h-8 shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-bold transition ${
                  linkCategoryId === "all" ? "border-stone-950 text-stone-950 shadow-sm" : "border-transparent text-stone-700"
                }`}
                style={{ backgroundColor: categoryFallback }}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setLinkCategoryId(category.id)}
                  className={`min-h-8 shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-bold transition ${
                    linkCategoryId === category.id
                      ? "border-stone-950 text-stone-950 shadow-sm"
                      : "border-transparent text-stone-700"
                  }`}
                  style={{ backgroundColor: category.defaultColor }}
                >
                  {category.name}
                </button>
              ))}
              {hasUncategorized && (
                <button
                  type="button"
                  onClick={() => setLinkCategoryId("uncategorized")}
                  className={`min-h-8 shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-bold transition ${
                    linkCategoryId === "uncategorized"
                      ? "border-stone-950 text-stone-950 shadow-sm"
                      : "border-transparent text-stone-700"
                  }`}
                  style={{ backgroundColor: categoryFallback }}
                >
                  Uncategorized
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-stone-500">
                {visibleLinkedCount}/{filteredRegularItems.length} linked
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={!hasLinkedVisibleItems}
                  onClick={() => void unlinkVisibleItems()}
                  className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold text-stone-700 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                >
                  Unlink All
                </button>
                <button
                  type="button"
                  disabled={!hasUnlinkedVisibleItems}
                  onClick={() => void linkVisibleItems()}
                  className="min-h-10 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
                >
                  Link All
                </button>
              </div>
            </div>
            {filteredRegularItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                No items in this category
              </p>
            ) : (
              <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
                {filteredRegularItems.map((item) => {
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
