import type { Adjustment, AppliedAdjustment, CartLine, CartTotals, Item } from "../types";

export function calculateCartTotals(
  cart: CartLine[],
  items: Item[],
  adjustments: Adjustment[],
): CartTotals {
  const subtotal = cart.reduce((sum, line) => {
    const item = items.find((entry) => entry.id === line.itemId);
    return sum + (item?.price ?? 0) * line.quantity;
  }, 0);

  const appliedAdjustments: AppliedAdjustment[] = adjustments
    .filter((adjustment) => adjustment.enabled)
    .map((adjustment) => {
      const computedAmount =
        adjustment.type === "percentage"
          ? Math.round(subtotal * (adjustment.value / 100))
          : Math.round(adjustment.value);

      return {
        adjustmentId: adjustment.id,
        label: adjustment.label,
        type: adjustment.type,
        value: adjustment.value,
        computedAmount,
      };
    });

  const adjustmentsTotal = appliedAdjustments.reduce(
    (sum, adjustment) => sum + adjustment.computedAmount,
    0,
  );

  return {
    subtotal,
    appliedAdjustments,
    adjustmentsTotal,
    total: subtotal + adjustmentsTotal,
  };
}
