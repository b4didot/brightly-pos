import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { categoryFallback } from "../../constants/catalog";
import { usePosStore } from "../../store/usePosStore";
import type { Item } from "../../types";
import { formatPeso, parsePesoInput } from "../../utils/money";
import { SettingRow } from "./SettingRow";
import { StatusPill } from "./StatusPill";

type ItemModalState = { type: "add" } | { type: "edit" | "delete"; selectedId: string };

export function ItemsSection() {
  const categories = usePosStore((state) => state.categories);
  const items = usePosStore((state) => state.items);
  const itemVariants = usePosStore((state) => state.itemVariants);
  const modifiers = usePosStore((state) => state.modifiers);
  const itemModifiers = usePosStore((state) => state.itemModifiers);
  const itemAddOns = usePosStore((state) => state.itemAddOns);
  const saveItem = usePosStore((state) => state.saveItem);
  const deleteItem = usePosStore((state) => state.deleteItem);
  const toggleItemOutOfStock = usePosStore((state) => state.toggleItemOutOfStock);
  const saveItemVariant = usePosStore((state) => state.saveItemVariant);
  const deleteItemVariant = usePosStore((state) => state.deleteItemVariant);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState<string>("uncategorized");
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [modalState, setModalState] = useState<ItemModalState | null>(null);

  const selectedItem =
    modalState && "selectedId" in modalState ? items.find((item) => item.id === modalState.selectedId) : null;
  const linkedModifiers = editingItem
    ? modifiers.filter((modifier) =>
        itemModifiers.some(
          (itemModifier) => itemModifier.itemId === editingItem.id && itemModifier.modifierId === modifier.id,
        ),
      )
    : [];
  const linkedAddOns = editingItem
    ? items.filter(
        (item) =>
          item.isAddOn &&
          itemAddOns.some((itemAddOn) => itemAddOn.itemId === editingItem.id && itemAddOn.addOnItemId === item.id),
      )
    : [];

  function closeModal() {
    setModalState(null);
    resetForm();
  }

  function openAddModal() {
    resetForm();
    setModalState({ type: "add" });
  }

  function startEdit(item: Item) {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(String(item.price / 100));
    setItemCategoryId(item.categoryId ?? "uncategorized");
    setModalState({ type: "edit", selectedId: item.id });
  }

  function openDeleteModal(itemId: string) {
    resetForm();
    setModalState({ type: "delete", selectedId: itemId });
  }

  function resetForm() {
    setEditingItem(null);
    setItemName("");
    setItemPrice("");
    setItemCategoryId("uncategorized");
    setNewVariantName("");
    setNewVariantPrice("");
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!itemName.trim()) {
      return;
    }

    await saveItem({
      id: editingItem?.id,
      name: itemName,
      price: parsePesoInput(itemPrice),
      categoryId: itemCategoryId === "uncategorized" ? null : itemCategoryId,
    });
    closeModal();
  }

  async function confirmDeleteItem() {
    if (!selectedItem) {
      return;
    }

    await deleteItem(selectedItem.id);
    closeModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={openAddModal}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800"
      >
        <Plus size={17} />
        Add Item
      </button>
      <div className="mt-4 grid gap-2">
        {items.filter((item) => !item.isAddOn).map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);

          return (
            <SettingRow
              key={item.id}
              title={item.name}
              detail={`${category?.name ?? "Uncategorized"} - ${formatPeso(item.price)}`}
              status={item.isOutOfStock ? "Out of stock" : "Available"}
              swatch={category?.defaultColor ?? categoryFallback}
              aside={
                <StatusPill checked={item.isOutOfStock} label="Out" onChange={() => void toggleItemOutOfStock(item.id)} />
              }
              onEdit={() => startEdit(item)}
              onDelete={() => openDeleteModal(item.id)}
            />
          );
        })}
      </div>

      <Modal
        isOpen={modalState?.type !== "delete" && Boolean(modalState)}
        onClose={closeModal}
        title={editingItem ? "Edit Item" : "Add Item"}
      >
        <form onSubmit={(event) => void submitItem(event)} className="grid gap-3">
          <input autoFocus value={itemName} onChange={(event) => setItemName(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700" placeholder="Item name" />
          <input type="number" min="0" step="0.01" value={itemPrice} onChange={(event) => setItemPrice(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700" placeholder="Price" />
          <select value={itemCategoryId} onChange={(event) => setItemCategoryId(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700">
            <option value="uncategorized">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {editingItem && (
            <>
              <div className="min-w-0 rounded-lg border border-stone-200 p-3">
                <p className="mb-2 text-sm font-bold text-stone-700">Sizes / Variants</p>
                <p className="mb-2 text-xs text-stone-500">
                  If sizes are added, customers must pick one. The item's base price is ignored.
                </p>
                <div className="mb-2 space-y-1.5">
                  {itemVariants
                    .filter((variant) => variant.itemId === editingItem.id)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((variant) => (
                      <div
                        key={variant.id}
                        className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm font-semibold">{variant.name}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="whitespace-nowrap text-sm text-stone-500">{formatPeso(variant.price)}</span>
                          <button
                            type="button"
                            onClick={() => void deleteItemVariant(variant.id)}
                            className="grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(5.75rem,7rem)_2.5rem] gap-2">
                  <input
                    value={newVariantName}
                    onChange={(event) => setNewVariantName(event.target.value)}
                    className="min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-700"
                    placeholder="Name (e.g. Large)"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariantPrice}
                    onChange={(event) => setNewVariantPrice(event.target.value)}
                    className="min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-700"
                    placeholder="Price"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newVariantName.trim() || !newVariantPrice) {
                        return;
                      }

                      const existingVariants = itemVariants.filter((variant) => variant.itemId === editingItem.id);
                      await saveItemVariant({
                        itemId: editingItem.id,
                        name: newVariantName.trim(),
                        price: parsePesoInput(newVariantPrice),
                        sortOrder: existingVariants.length,
                      });
                      setNewVariantName("");
                      setNewVariantPrice("");
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-950 text-white hover:bg-stone-800"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 p-3">
                <p className="mb-2 text-sm font-bold text-stone-700">Modifiers</p>
                {linkedModifiers.length === 0 ? (
                  <p className="rounded-md bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-500">
                    No modifiers linked
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {linkedModifiers.map((modifier) => (
                      <div key={modifier.id} className="rounded-md bg-stone-50 px-3 py-2">
                        <span className="block text-sm font-semibold text-stone-800">{modifier.label}</span>
                        <span className="block text-xs text-stone-500">{modifier.options.join(" - ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-stone-200 p-3">
                <p className="mb-2 text-sm font-bold text-stone-700">Add-ons</p>
                {linkedAddOns.length === 0 ? (
                  <p className="rounded-md bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-500">
                    No add-ons linked
                  </p>
                ) : (
                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                    {linkedAddOns.map((addOnItem) => (
                      <div
                        key={addOnItem.id}
                        className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm font-semibold text-stone-800">{addOnItem.name}</span>
                        <span className="shrink-0 whitespace-nowrap text-xs text-stone-500">
                          {formatPeso(addOnItem.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white" type="submit">
              {editingItem ? "Save Item" : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalState?.type === "delete"} onClose={closeModal} title="Delete Item">
        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-700">
            Delete <span className="font-bold text-stone-950">{selectedItem?.name}</span>? This item will also be
            removed from the current cart.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button type="button" onClick={() => void confirmDeleteItem()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white transition hover:bg-red-700">
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
