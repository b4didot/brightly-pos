import { BadgePercent, Check, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../../components/Modal";
import type { AppliedDiscount, DiscountTemplate } from "../../types";
import { createAppliedDiscount } from "../../utils/cart";
import { formatPeso, parsePesoInput } from "../../utils/money";

function formatTemplate(discount: DiscountTemplate) {
  return discount.type === "flat" ? formatPeso(discount.value) : `${discount.value}%`;
}

export function DiscountModal({
  currentDiscount,
  discountTemplates,
  subtotal,
  onApplyDiscount,
  onClearDiscount,
  onClose,
}: {
  currentDiscount: AppliedDiscount | null;
  discountTemplates: DiscountTemplate[];
  subtotal: number;
  onApplyDiscount: (discount: AppliedDiscount) => void;
  onClearDiscount: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"templates" | "manual">(
    discountTemplates.length > 0 ? "templates" : "manual",
  );
  const [manualType, setManualType] = useState<"percentage" | "flat">("percentage");
  const [manualValue, setManualValue] = useState("");

  function applyTemplate(discount: DiscountTemplate) {
    onApplyDiscount(
      createAppliedDiscount({
        discountId: discount.id,
        label: discount.label,
        type: discount.type,
        value: discount.value,
        subtotal,
      }),
    );
    onClose();
  }

  function submitManualDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = manualType === "flat" ? parsePesoInput(manualValue) : Math.max(0, Number(manualValue) || 0);

    if (value <= 0) {
      return;
    }

    onApplyDiscount(
      createAppliedDiscount({
        discountId: null,
        label: "Manual Discount",
        type: manualType,
        value,
        subtotal,
      }),
    );
    onClose();
  }

  return (
    <Modal isOpen onClose={onClose} title="Apply Discount">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("templates")}
            className={`min-h-11 rounded-lg border px-3 font-bold transition ${
              mode === "templates"
                ? "border-amber-700 bg-amber-50 text-amber-800"
                : "border-stone-300 text-stone-600 hover:border-stone-400"
            }`}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`min-h-11 rounded-lg border px-3 font-bold transition ${
              mode === "manual"
                ? "border-amber-700 bg-amber-50 text-amber-800"
                : "border-stone-300 text-stone-600 hover:border-stone-400"
            }`}
          >
            Manual
          </button>
        </div>

        {currentDiscount && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-amber-900">{currentDiscount.label}</p>
              <p className="text-xs font-semibold text-amber-700">-{formatPeso(currentDiscount.computedAmount)}</p>
            </div>
            <button type="button" onClick={onClearDiscount} className="grid h-9 w-9 place-items-center rounded-lg border border-amber-200 text-amber-900">
              <X size={16} />
            </button>
          </div>
        )}

        {mode === "templates" ? (
          <div className="grid gap-2">
            {discountTemplates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
                No discount templates available
              </p>
            ) : (
              discountTemplates.map((discount) => (
                <button
                  key={discount.id}
                  type="button"
                  onClick={() => applyTemplate(discount)}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 text-left transition hover:border-amber-700 hover:bg-amber-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <BadgePercent size={18} className="shrink-0 text-amber-800" />
                    <span className="truncate font-bold">{discount.label}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-stone-600">{formatTemplate(discount)}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={submitManualDiscount} className="grid gap-3">
            <select value={manualType} onChange={(event) => setManualType(event.target.value as "percentage" | "flat")} className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700">
              <option value="percentage">Percentage</option>
              <option value="flat">Flat amount</option>
            </select>
            <input
              autoFocus
              type="number"
              min="0"
              step={manualType === "flat" ? "0.01" : "0.1"}
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
              placeholder={manualType === "flat" ? "Amount" : "Percent"}
            />
            <button type="submit" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white">
              <Check size={17} />
              Apply Discount
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
