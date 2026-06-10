import { Link2, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { categoryFallback } from "../../constants/catalog";
import { usePosStore } from "../../store/usePosStore";
import type { Modifier } from "../../types";
import { SettingRow } from "./SettingRow";

type ModifierModalState = { type: "add" } | { type: "edit" | "delete" | "link"; selectedId: string };

export function ModifiersSection() {
  const categories = usePosStore((state) => state.categories);
  const items = usePosStore((state) => state.items);
  const modifiers = usePosStore((state) => state.modifiers);
  const itemModifiers = usePosStore((state) => state.itemModifiers);
  const saveModifier = usePosStore((state) => state.saveModifier);
  const deleteModifier = usePosStore((state) => state.deleteModifier);
  const linkModifierToItem = usePosStore((state) => state.linkModifierToItem);
  const unlinkModifierFromItem = usePosStore((state) => state.unlinkModifierFromItem);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [label, setLabel] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [linkCategoryId, setLinkCategoryId] = useState("all");
  const [modalState, setModalState] = useState<ModifierModalState | null>(null);

  const selectedModifier =
    modalState && "selectedId" in modalState ? modifiers.find((modifier) => modifier.id === modalState.selectedId) : null;
  const regularItems = items.filter((item) => !item.isAddOn);
  const hasUncategorized = regularItems.some((item) => !item.categoryId);
  const filteredRegularItems = regularItems.filter((item) => {
    if (linkCategoryId === "all") return true;
    if (linkCategoryId === "uncategorized") return !item.categoryId;
    return item.categoryId === linkCategoryId;
  });
  const hasUnlinkedVisibleItems = Boolean(
    selectedModifier &&
      filteredRegularItems.some(
        (item) =>
          !itemModifiers.some(
            (itemModifier) => itemModifier.itemId === item.id && itemModifier.modifierId === selectedModifier.id,
          ),
      ),
  );
  const hasLinkedVisibleItems = Boolean(
    selectedModifier &&
      filteredRegularItems.some((item) =>
        itemModifiers.some(
          (itemModifier) => itemModifier.itemId === item.id && itemModifier.modifierId === selectedModifier.id,
        ),
      ),
  );
  const visibleLinkedCount = selectedModifier
    ? filteredRegularItems.filter((item) =>
        itemModifiers.some(
          (itemModifier) => itemModifier.itemId === item.id && itemModifier.modifierId === selectedModifier.id,
        ),
      ).length
    : 0;

  function closeModal() {
    setModalState(null);
    resetForm();
  }

  function openAddModal() {
    resetForm();
    setModalState({ type: "add" });
  }

  function startEdit(modifier: Modifier) {
    setEditingModifier(modifier);
    setLabel(modifier.label);
    setOptionsText(modifier.options.join(", "));
    setModalState({ type: "edit", selectedId: modifier.id });
  }

  function openDeleteModal(modifierId: string) {
    resetForm();
    setModalState({ type: "delete", selectedId: modifierId });
  }

  function openLinkModal(modifierId: string) {
    resetForm();
    setModalState({ type: "link", selectedId: modifierId });
  }

  function resetForm() {
    setEditingModifier(null);
    setLabel("");
    setOptionsText("");
    setLinkCategoryId("all");
  }

  async function submitModifier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!label.trim()) return;

    const options = optionsText
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    if (options.length === 0) return;

    await saveModifier({ id: editingModifier?.id, label, options });
    closeModal();
  }

  async function confirmDelete() {
    if (!selectedModifier) return;

    await deleteModifier(selectedModifier.id);
    closeModal();
  }

  async function linkVisibleItems() {
    if (!selectedModifier) {
      return;
    }

    for (const item of filteredRegularItems) {
      const isLinked = itemModifiers.some(
        (itemModifier) => itemModifier.itemId === item.id && itemModifier.modifierId === selectedModifier.id,
      );

      if (!isLinked) {
        await linkModifierToItem(item.id, selectedModifier.id);
      }
    }
  }

  async function unlinkVisibleItems() {
    if (!selectedModifier) {
      return;
    }

    for (const item of filteredRegularItems) {
      const isLinked = itemModifiers.some(
        (itemModifier) => itemModifier.itemId === item.id && itemModifier.modifierId === selectedModifier.id,
      );

      if (isLinked) {
        await unlinkModifierFromItem(item.id, selectedModifier.id);
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
        Add Modifier
      </button>

      <div className="mt-4 grid gap-2">
        {modifiers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            No modifiers yet
          </p>
        ) : (
          modifiers.map((modifier) => {
            const linkedCount = itemModifiers.filter((itemModifier) => itemModifier.modifierId === modifier.id).length;

            return (
              <SettingRow
                key={modifier.id}
                title={modifier.label}
                detail={`${modifier.options.join(" | ")} - linked to ${linkedCount} item${linkedCount === 1 ? "" : "s"}`}
                aside={
                  <button
                    type="button"
                    onClick={() => openLinkModal(modifier.id)}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold"
                  >
                    <Link2 size={15} />
                    Link
                  </button>
                }
                onEdit={() => startEdit(modifier)}
                onDelete={() => openDeleteModal(modifier.id)}
              />
            );
          })
        )}
      </div>

      <Modal
        isOpen={modalState?.type !== "delete" && modalState?.type !== "link" && Boolean(modalState)}
        onClose={closeModal}
        title={editingModifier ? "Edit Modifier" : "Add Modifier"}
      >
        <form onSubmit={(event) => void submitModifier(event)} className="grid gap-3">
          <input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="e.g. Sugar Level"
          />
          <div>
            <input
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
              placeholder="Options, comma-separated (e.g. 100%, 75%, 50%)"
            />
            <p className="mt-1 text-xs text-stone-500">Separate options with commas</p>
          </div>
          {optionsText ? (
            <div className="flex flex-wrap gap-1.5">
              {optionsText
                .split(",")
                .map((option) => option.trim())
                .filter(Boolean)
                .map((option) => (
                  <span
                    key={option}
                    className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700"
                  >
                    {option}
                  </span>
                ))}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button type="submit" className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white">
              {editingModifier ? "Save" : "Add Modifier"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modalState?.type === "link"}
        onClose={closeModal}
        title={`Link ${selectedModifier?.label ?? "Modifier"}`}
      >
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
                  const category = categories.find((entry) => entry.id === item.categoryId);
                  const isLinked = itemModifiers.some(
                    (itemModifier) =>
                      itemModifier.itemId === item.id && itemModifier.modifierId === selectedModifier?.id,
                  );

                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{item.name}</span>
                        <span className="block truncate text-sm text-stone-500">
                          {category?.name ?? "Uncategorized"}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isLinked}
                        disabled={!selectedModifier}
                        onChange={() =>
                          void (selectedModifier &&
                            (isLinked
                              ? unlinkModifierFromItem(item.id, selectedModifier.id)
                              : linkModifierToItem(item.id, selectedModifier.id)))
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

      <Modal isOpen={modalState?.type === "delete"} onClose={closeModal} title="Delete Modifier">
        <div className="grid gap-4">
          <p className="text-sm font-semibold text-stone-700">
            Delete <span className="font-bold text-stone-950">{selectedModifier?.label}</span>? This modifier will be
            unlinked from all items.
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
