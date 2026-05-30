import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import { usePosStore } from "../../store/usePosStore";
import type { Modifier } from "../../types";
import { SettingRow } from "./SettingRow";

type ModifierModalState = { type: "add" } | { type: "edit" | "delete"; selectedId: string };

export function ModifiersSection() {
  const modifiers = usePosStore((state) => state.modifiers);
  const saveModifier = usePosStore((state) => state.saveModifier);
  const deleteModifier = usePosStore((state) => state.deleteModifier);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [label, setLabel] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [modalState, setModalState] = useState<ModifierModalState | null>(null);

  const selectedModifier =
    modalState && "selectedId" in modalState ? modifiers.find((modifier) => modifier.id === modalState.selectedId) : null;

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

  function resetForm() {
    setEditingModifier(null);
    setLabel("");
    setOptionsText("");
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

  return (
    <>
      <button
        type="button"
        onClick={openAddModal}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800 sm:w-auto"
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
          modifiers.map((modifier) => (
            <SettingRow
              key={modifier.id}
              title={modifier.label}
              detail={modifier.options.join(" | ")}
              onEdit={() => startEdit(modifier)}
              onDelete={() => openDeleteModal(modifier.id)}
            />
          ))
        )}
      </div>

      <Modal
        isOpen={modalState?.type !== "delete" && Boolean(modalState)}
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
