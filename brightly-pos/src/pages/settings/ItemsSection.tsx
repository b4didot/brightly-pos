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
  const saveItem = usePosStore((state) => state.saveItem);
  const deleteItem = usePosStore((state) => state.deleteItem);
  const toggleItemOutOfStock = usePosStore((state) => state.toggleItemOutOfStock);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState<string>("uncategorized");
  const [modalState, setModalState] = useState<ItemModalState | null>(null);

  const selectedItem =
    modalState && "selectedId" in modalState ? items.find((item) => item.id === modalState.selectedId) : null;

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
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800 sm:w-auto"
      >
        <Plus size={17} />
        Add Item
      </button>
      <div className="mt-4 grid gap-2">
        {items.map((item) => {
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
