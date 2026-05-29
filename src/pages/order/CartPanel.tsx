import { Banknote, CreditCard, Minus, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { CartSheet } from "../../components/CartSheet";
import { usePosStore } from "../../store/usePosStore";
import type { CartLine, CartTotals, Item, PaymentMethod } from "../../types";
import { formatPeso } from "../../utils/money";
import type { VatBreakdown } from "../../utils/vat";
import { IconButton, SummaryLine, VatBreakdownLines } from "./OrderUi";

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
  isCartExpanded,
  pendingTransactionId,
  totals,
  vatBreakdown,
  onOpenPaymentModal,
  onRequestRemoveLine,
  onToggleCart,
}: {
  activePaymentMethod: PaymentMethod;
  cart: CartLine[];
  isCartExpanded: boolean;
  pendingTransactionId: string;
  totals: CartTotals;
  vatBreakdown: VatBreakdown;
  onOpenPaymentModal: (method: PaymentMethod) => void;
  onRequestRemoveLine: (item: Item) => void;
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
    .filter((line): line is { itemId: string; quantity: number; item: Item } => Boolean(line));

  return (
    <CartSheet
      isExpanded={isCartExpanded}
      items={cart}
      onToggle={onToggleCart}
      total={totals.total}
      title={<p className="truncate text-xs font-bold text-stone-700">Txn ID: {pendingTransactionId}</p>}
    >
      <div className="border-b border-stone-200 px-3 py-2 md:hidden">
        <p className="truncate text-xs font-bold text-stone-700">Txn ID: {pendingTransactionId}</p>
      </div>

      <div className="max-h-[48vh] overflow-auto px-2 py-2 lg:max-h-[54vh]">
        {cartRows.length === 0 ? (
          <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-stone-300 text-sm text-stone-500">
            No items selected
          </div>
        ) : (
          <div className="space-y-2">
            {cartRows.map((line) => (
              <div
                key={line.itemId}
                className="grid min-h-12 grid-cols-[minmax(0,1fr)_34px_38px_34px_34px] items-center gap-1 rounded-md bg-stone-50 px-2 py-2"
              >
                <p className="min-w-0 truncate text-sm font-semibold">
                  {line.item.name} <span className="font-medium text-stone-500">({formatPeso(line.item.price)})</span>
                </p>
                <IconButton
                  disabled={line.item.isOutOfStock}
                  label={line.item.isOutOfStock ? `${line.item.name} is out of stock` : `Add ${line.item.name}`}
                  onClick={() => incrementCartLine(line.itemId)}
                >
                  <Plus size={15} />
                </IconButton>
                <span className="text-center text-sm font-bold">{line.quantity}</span>
                <IconButton label={`Remove one ${line.item.name}`} onClick={() => decrementCartLine(line.itemId)}>
                  <Minus size={15} />
                </IconButton>
                <IconButton label={`Remove ${line.item.name}`} tone="danger" onClick={() => onRequestRemoveLine(line.item)}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-stone-200 px-3 py-3">
        <div className="rounded-md bg-stone-50 px-3 py-2">
          <SummaryLine label="Subtotal" value={formatPeso(totals.subtotal)} />
          {totals.appliedAdjustments.map((adjustment) => (
            <SummaryLine key={adjustment.adjustmentId} label={adjustment.label} value={formatPeso(adjustment.computedAmount)} />
          ))}
          <VatBreakdownLines vatAmount={vatBreakdown.vatAmount} vatEnabled={vatBreakdown.vatEnabled} vatableSales={vatBreakdown.vatableSales} />
          <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2">
            <span className="text-sm font-bold text-stone-700">Total</span>
            <span className="text-2xl font-bold">{formatPeso(totals.total)}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
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
