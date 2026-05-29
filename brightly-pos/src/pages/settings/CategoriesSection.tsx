import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { categoryColors } from "../../constants/catalog";
import { usePosStore } from "../../store/usePosStore";
import type { Category } from "../../types";
import { SettingRow } from "./SettingRow";

type CategoryModalState = { type: "add" } | { type: "edit" | "delete"; selectedId: string };

export function CategoriesSection() {
  const categories = usePosStore((state) => state.categories);
  const saveCategory = usePosStore((state) => state.saveCategory);
  const deleteCategory = usePosStore((state) => state.deleteCategory);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(categoryColors[0]);
  const [modalState, setModalState] = useState<CategoryModalState | null>(null);

  const selectedCategory =
    modalState && "selectedId" in modalState
      ? categories.find((category) => category.id === modalState.selectedId)
      : null;

  function closeModal() {
    setModalState(null);
    resetForm();
  }

  function openAddModal() {
    resetForm();
    setModalState({ type: "add" });
  }

  function startEdit(category: Category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.defaultColor);
    setModalState({ type: "edit", selectedId: category.id });
  }

  function openDeleteModal(categoryId: string) {
    resetForm();
    setModalState({ type: "delete", selectedId: categoryId });
  }

  function resetForm() {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryColor(categoryColors[0]);
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryName.trim()) {
      return;
    }

    await saveCategory({
      id: editingCategory?.id,
      name: categoryName,
      defaultColor: categoryColor,
    });
    closeModal();
  }

  async function confirmDeleteCategory() {
    if (!selectedCategory) {
      return;
    }

    await deleteCategory(selectedCategory.id);
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
        Add Category
      </button>
      <div className="mt-4 grid gap-2">
        {categories.map((category) => (
          <SettingRow
            key={category.id}
            title={category.name}
            detail="Editable category"
            swatch={category.defaultColor}
            onEdit={() => startEdit(category)}
            onDelete={() => openDeleteModal(category.id)}
          />
        ))}
      </div>

      <Modal
        isOpen={modalState?.type !== "delete" && Boolean(modalState)}
        onClose={closeModal}
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <form onSubmit={(event) => void submitCategory(event)} className="grid gap-3">
          <input
            autoFocus
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="Category name"
          />
          <div className="flex flex-wrap items-center gap-2">
            {categoryColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                onClick={() => setCategoryColor(color)}
                className={`h-10 w-10 rounded-full border-2 ${
                  categoryColor === color ? "border-stone-950" : "border-white"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white" type="submit">
              {editingCategory ? "Save Category" : "Add Category"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalState?.type === "delete"} onClose={closeModal} title="Delete Category">
        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-700">
            Delete <span className="font-bold text-stone-950">{selectedCategory?.name}</span>? Items in this category
            will be uncategorized.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={closeModal} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <button type="button" onClick={() => void confirmDeleteCategory()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white transition hover:bg-red-700">
              <Trash2 size={17} />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
