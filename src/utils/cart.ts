import type { Adjustment, AppliedAdjustment, AppliedDiscount, CartLine, CartTotals, Item } from "../types";

export function calculateCartTotals(
  cart: CartLine[],
  items: Item[],
  adjustments: Adjustment[],
  discount: AppliedDiscount | null = null,
): CartTotals {
  const subtotal = cart.reduce((sum, line) => {
    const item = items.find((entry) => entry.id === line.itemId);
    if (!item) return sum;
    const effectivePrice = line.variantPrice ?? item.price;
    const addOnsTotal = line.selectedAddOns.reduce((total, addOn) => total + addOn.price, 0);
    return sum + (effectivePrice + addOnsTotal) * line.quantity;
  }, 0);

  const rawDiscountTotal = discount
    ? discount.type === "percentage"
      ? Math.round(subtotal * (Math.max(0, discount.value) / 100))
      : Math.round(Math.max(0, discount.value))
    : 0;
  const discountTotal = Math.min(subtotal, rawDiscountTotal);
  const subtotalAfterDiscount = Math.max(0, subtotal - discountTotal);
  const appliedDiscount = discount
    ? {
        ...discount,
        computedAmount: discountTotal,
      }
    : null;

  const appliedAdjustments: AppliedAdjustment[] = adjustments
    .filter((adjustment) => adjustment.enabled && adjustment.value > 0)
    .map((adjustment) => {
      const computedAmount =
        adjustment.type === "percentage"
          ? Math.round(subtotalAfterDiscount * (adjustment.value / 100))
          : Math.round(Math.max(0, adjustment.value));

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
    appliedDiscount,
    discountTotal,
    appliedAdjustments,
    adjustmentsTotal,
    total: Math.max(0, subtotalAfterDiscount + adjustmentsTotal),
  };
}

export function createAppliedDiscount({
  discountId,
  label,
  subtotal,
  type,
  value,
}: Omit<AppliedDiscount, "computedAmount"> & { subtotal: number }) {
  const computedAmount =
    type === "percentage"
      ? Math.round(subtotal * (Math.max(0, value) / 100))
      : Math.round(Math.max(0, value));

  return {
    discountId,
    label: label.trim(),
    type,
    value,
    computedAmount: Math.min(subtotal, computedAmount),
  };
}
