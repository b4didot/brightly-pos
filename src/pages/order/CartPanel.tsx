import { BadgePercent, Banknote, CreditCard, Minus, Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { CartSheet } from "../../components/CartSheet";
import type { CartSheetState } from "../../components/CartSheet";
import { usePosStore } from "../../store/usePosStore";
import type { CartLine, CartTotals, Item, OrderType, PaymentMethod } from "../../types";
import { formatPeso } from "../../utils/money";
import type { VatBreakdown } from "../../utils/vat";
import { IconButton, SummaryLine, VatBreakdownLines } from "./OrderUi";

type CartRow = CartLine & { item: Item };

function PaymentButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
        active
          ? "border-amber-700 bg-amber-50 text-amber-800"
          : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
      } disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-300`}
    >
      {icon}
      {label}
    </button>
  );
}

export function CartPanel({
  activePaymentMethod,
  cart,
  sheetState,
  totals,
  vatBreakdown,
  orderType,
  onOpenPaymentModal,
  onOpenDiscountModal,
  onRequestRemoveLine,
  onClearDiscount,
  onSetOrderType,
  onToggleCart,
}: {
  activePaymentMethod: PaymentMethod;
  cart: CartLine[];
  sheetState: CartSheetState;
  totals: CartTotals;
  vatBreakdown: VatBreakdown;
  orderType: OrderType;
  onOpenPaymentModal: (method: PaymentMethod) => void;
  onOpenDiscountModal: () => void;
  onRequestRemoveLine: (item: Item) => void;
  onClearDiscount: () => void;
  onSetOrderType: (orderType: OrderType) => void;
  onToggleCart: () => void;
}) {
  const items = usePosStore((state) => state.items);
  const settings = usePosStore((state) => state.settings);
  const incrementCartLine = usePosStore((state) => state.incrementCartLine);
  const decrementCartLine = usePosStore((state) => state.decrementCartLine);
  const cartRows = cart
    .map((line) => {
      const item = items.find((entry) => entry.id === line.itemId);
      return item ? { ...line, item } : null;
    })
    .filter((line): line is CartRow => Boolean(line));
  const isHalfSheet = sheetState === "half";

  return (
    <CartSheet sheetState={sheetState} items={cart} onToggle={onToggleCart} total={totals.total}>
      <div className={`cart-sheet-items min-h-0 flex-1 overflow-y-auto px-2 py-2 md:max-h-[48vh] md:flex-none lg:max-h-[54vh] ${isHalfSheet ? "cart-sheet-half-items" : ""}`}>
        {cartRows.length === 0 ? (
          <div className={`grid place-items-center rounded-lg border border-dashed border-stone-300 text-sm text-stone-500 ${isHalfSheet ? "min-h-16" : "min-h-28"}`}>
            No items selected
          </div>
        ) : (
          <div className="space-y-2">
            {cartRows.map((line) => {
              const linePrice =
                (line.variantPrice ?? line.item.price) +
                line.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);

              return (
                <div
                  key={line.id}
                  className={`grid grid-cols-[minmax(0,1fr)_34px_38px_34px_34px] items-center gap-1 rounded-md bg-stone-50 px-2 ${
                    isHalfSheet ? "min-h-10 py-1.5" : "min-h-12 py-2"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {line.item.name}
                      {line.variantName && (
                        <span className="ml-1 font-medium text-stone-500">- {line.variantName}</span>
                      )}
                      <span className="ml-1 font-medium text-stone-500">({formatPeso(linePrice)})</span>
                    </p>
                    {line.selectedModifiers.length > 0 && (
                      <p className="truncate text-xs text-stone-500">
                        {line.selectedModifiers
                          .map((modifier) => `${modifier.label}: ${modifier.selectedOption}`)
                          .join(" - ")}
                      </p>
                    )}
                    {line.selectedAddOns.length > 0 && (
                      <p className="truncate text-xs text-stone-500">
                        Add-ons: {line.selectedAddOns.map((addOn) => addOn.name).join(" - ")}
                      </p>
                    )}
                  </div>
                  <IconButton
                    disabled={line.item.isOutOfStock}
                    label={line.item.isOutOfStock ? `${line.item.name} is out of stock` : `Add ${line.item.name}`}
                    onClick={() => incrementCartLine(line.id)}
                  >
                    <Plus size={15} />
                  </IconButton>
                  <span className="text-center text-sm font-bold">{line.quantity}</span>
                  <IconButton label={`Remove one ${line.item.name}`} onClick={() => decrementCartLine(line.id)}>
                    <Minus size={15} />
                  </IconButton>
                  <IconButton label={`Remove ${line.item.name}`} tone="danger" onClick={() => onRequestRemoveLine(line.item)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`cart-sheet-actions shrink-0 border-t border-stone-200 px-3 ${isHalfSheet ? "py-2" : "py-3"}`}>
        <div className={`${isHalfSheet ? "mb-1.5 gap-1.5" : "mb-3 gap-2"} grid grid-cols-2`}>
          <button
            type="button"
            onClick={() => onSetOrderType("dine-in")}
            className={`${isHalfSheet ? "min-h-8 px-2 text-xs" : "min-h-10 text-sm"} rounded-lg border font-bold transition ${
              orderType === "dine-in"
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-300 text-stone-600 hover:border-stone-400"
            }`}
          >
            Dine In
          </button>
          <button
            type="button"
            onClick={() => onSetOrderType("take-out")}
            className={`${isHalfSheet ? "min-h-8 px-2 text-xs" : "min-h-10 text-sm"} rounded-lg border font-bold transition ${
              orderType === "take-out"
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-300 text-stone-600 hover:border-stone-400"
            }`}
          >
            Take Out
          </button>
        </div>

        <div className={`rounded-md bg-stone-50 px-3 ${isHalfSheet ? "py-1.5" : "py-2"}`}>
          <SummaryLine label="Subtotal" value={formatPeso(totals.subtotal)} />
          {totals.appliedDiscount && (
            <SummaryLine label={totals.appliedDiscount.label} value={`-${formatPeso(totals.discountTotal)}`} />
          )}
          {totals.appliedAdjustments.map((adjustment) => (
            <SummaryLine
              key={adjustment.adjustmentId}
              label={adjustment.label}
              value={formatPeso(adjustment.computedAmount)}
            />
          ))}
          <VatBreakdownLines
            vatAmount={vatBreakdown.vatAmount}
            vatEnabled={vatBreakdown.vatEnabled}
            vatableSales={vatBreakdown.vatableSales}
          />
          <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2">
            <span className="text-sm font-bold text-stone-700">Total</span>
            <span className={`${isHalfSheet ? "text-xl" : "text-2xl"} font-bold`}>{formatPeso(totals.total)}</span>
          </div>
        </div>

        {settings.discountEnabled && (
          <div className={`${isHalfSheet ? "mt-1.5 gap-1.5" : "mt-3 gap-2"} grid grid-cols-[1fr_auto]`}>
            <button
              type="button"
              disabled={cartRows.length === 0}
              onClick={onOpenDiscountModal}
              className={`flex items-center justify-center rounded-lg border border-stone-300 font-bold text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-300 ${
                isHalfSheet ? "min-h-9 gap-1.5 px-2 text-xs" : "min-h-11 gap-2 px-3 text-sm"
              }`}
            >
              <BadgePercent size={isHalfSheet ? 15 : 17} />
              {totals.appliedDiscount ? "Change Discount" : "Discount"}
            </button>
            <button
              type="button"
              disabled={!totals.appliedDiscount}
              onClick={onClearDiscount}
              className={`${isHalfSheet ? "h-9 w-9" : "h-11 w-11"} grid place-items-center rounded-lg border border-stone-300 text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-300`}
              aria-label="Clear discount"
            >
              <X size={isHalfSheet ? 15 : 17} />
            </button>
          </div>
        )}

        <div className={`${isHalfSheet ? "mt-2" : "mt-3"} grid grid-cols-2 gap-2`}>
          <PaymentButton
            active={activePaymentMethod === "cash"}
            disabled={!settings.cashEnabled || cartRows.length === 0}
            icon={<Banknote size={18} />}
            label="Cash Tender"
            onClick={() => onOpenPaymentModal("cash")}
          />
          <PaymentButton
            active={activePaymentMethod === "card"}
            disabled={!settings.cardEnabled || cartRows.length === 0}
            icon={<CreditCard size={18} />}
            label="Card"
            onClick={() => onOpenPaymentModal("card")}
          />
        </div>
      </div>
    </CartSheet>
  );
}
