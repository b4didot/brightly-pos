import { useState } from "react";
import type { Item, ItemVariant, Modifier, SelectedAddOn, SelectedModifier } from "../../types";
import { formatPeso } from "../../utils/money";
import { ModalFrame } from "./OrderUi";

export function CustomizationModal({
  item,
  variants,
  modifiers,
  addOns,
  onClose,
  onAddToCart,
}: {
  item: Item;
  variants: ItemVariant[];
  modifiers: Modifier[];
  addOns: Item[];
  onClose: () => void;
  onAddToCart: (input: {
    variantId: string | null;
    variantName: string | null;
    variantPrice: number | null;
    selectedModifiers: SelectedModifier[];
    selectedAddOns: SelectedAddOn[];
  }) => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length === 1 ? variants[0].id : null
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const selectedAddOns = addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const displayPrice = (selectedVariant ? selectedVariant.price : item.price) + addOnsTotal;

  function handleSelectOption(modifierId: string, option: string) {
    setSelectedOptions((prev) => ({ ...prev, [modifierId]: option }));
  }

  function handleToggleAddOn(addOnId: string) {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId],
    );
  }

  function handleAdd() {
    if (variants.length > 0 && !selectedVariantId) {
      setError("Please select a size.");
      return;
    }

    const selectedModifiers: SelectedModifier[] = modifiers
      .filter((modifier) => selectedOptions[modifier.id])
      .map((modifier) => ({
        modifierId: modifier.id,
        label: modifier.label,
        selectedOption: selectedOptions[modifier.id],
      }));

    onAddToCart({
      variantId: selectedVariantId,
      variantName: selectedVariant?.name ?? null,
      variantPrice: selectedVariant?.price ?? null,
      selectedModifiers,
      selectedAddOns: selectedAddOns.map((addOn) => ({
        itemId: addOn.id,
        name: addOn.name,
        price: addOn.price,
      })),
    });
    onClose();
  }

  return (
    <ModalFrame title={item.name} onClose={onClose}>
      <div className="grid gap-4">
        {variants.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-700">Size</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setError("");
                  }}
                  className={`rounded-lg border px-3 py-2.5 text-left transition ${
                    selectedVariantId === variant.id
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                  }`}
                >
                  <span className="block text-sm font-bold">{variant.name}</span>
                  <span
                    className={`block text-xs ${
                      selectedVariantId === variant.id ? "text-stone-300" : "text-stone-500"
                    }`}
                  >
                    {formatPeso(variant.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {modifiers.map((modifier) => (
          <div key={modifier.id}>
            <p className="mb-2 text-sm font-semibold text-stone-700">{modifier.label}</p>
            <div className="flex flex-wrap gap-2">
              {modifier.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectOption(modifier.id, option)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    selectedOptions[modifier.id] === option
                      ? "border-amber-700 bg-amber-50 text-amber-800"
                      : "border-stone-200 text-stone-600 hover:border-stone-400"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}

        {addOns.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-700">Add-ons</p>
            <div className="grid gap-2">
              {addOns.map((addOn) => {
                const isSelected = selectedAddOnIds.includes(addOn.id);

                return (
                  <button
                    key={addOn.id}
                    type="button"
                    onClick={() => handleToggleAddOn(addOn.id)}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      isSelected
                        ? "border-amber-700 bg-amber-50 text-amber-900"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                    }`}
                  >
                    <span className="min-w-0 text-sm font-bold">{addOn.name}</span>
                    <span className="shrink-0 text-xs font-semibold">{formatPeso(addOn.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
          <span className="text-sm font-semibold text-stone-600">Price</span>
          <span className="text-lg font-bold text-stone-950">{formatPeso(displayPrice)}</span>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white transition hover:bg-stone-800"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
