import { Banknote, Check, CreditCard, Minus, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { categoryFallback } from "../constants/catalog";
import { usePosStore } from "../store/usePosStore";
import type { Item, PaymentMethod } from "../types";
import { calculateCartTotals } from "../utils/cart";
import { createId } from "../utils/id";
import { formatPeso, parsePesoInput } from "../utils/money";

type CashStep = "tender" | "change" | "complete";
type CardStep = "reference" | "confirm" | "complete";

export function OrderPage() {
  const categories = usePosStore((state) => state.categories);
  const items = usePosStore((state) => state.items);
  const adjustments = usePosStore((state) => state.adjustments);
  const settings = usePosStore((state) => state.settings);
  const cart = usePosStore((state) => state.cart);
  const selectedCategoryId = usePosStore((state) => state.selectedCategoryId);
  const setSelectedCategoryId = usePosStore((state) => state.setSelectedCategoryId);
  const addToCart = usePosStore((state) => state.addToCart);
  const incrementCartLine = usePosStore((state) => state.incrementCartLine);
  const decrementCartLine = usePosStore((state) => state.decrementCartLine);
  const removeCartLine = usePosStore((state) => state.removeCartLine);
  const checkout = usePosStore((state) => state.checkout);
  const totals = useMemo(() => calculateCartTotals(cart, items, adjustments), [cart, items, adjustments]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    settings.cashEnabled ? "cash" : "card",
  );
  const [paymentModal, setPaymentModal] = useState<PaymentMethod | null>(null);
  const [cashStep, setCashStep] = useState<CashStep>("tender");
  const [cardStep, setCardStep] = useState<CardStep>("reference");
  const [cashReceived, setCashReceived] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [modalTotal, setModalTotal] = useState(0);
  const [cartLinePendingRemoval, setCartLinePendingRemoval] = useState<Item | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState(() => createId("txn"));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const hasUncategorized = items.some((item) => !item.categoryId);
  const activePaymentMethod: PaymentMethod =
    paymentMethod === "cash" && settings.cashEnabled
      ? "cash"
      : paymentMethod === "card" && settings.cardEnabled
        ? "card"
        : settings.cashEnabled
          ? "cash"
          : "card";

  const filteredItems = items.filter((item) => {
    if (selectedCategoryId === "all") {
      return true;
    }

    if (selectedCategoryId === "uncategorized") {
      return !item.categoryId;
    }

    return item.categoryId === selectedCategoryId;
  });

  const cartRows = cart
    .map((line) => {
      const item = items.find((entry) => entry.id === line.itemId);
      return item ? { ...line, item } : null;
    })
    .filter((line): line is { itemId: string; quantity: number; item: Item } => Boolean(line));
  const cashTendered = parsePesoInput(cashReceived);
  const cashChange = Math.max(0, cashTendered - modalTotal);

  function openPaymentModal(method: PaymentMethod) {
    setPaymentMethod(method);
    setPaymentModal(method);
    setModalTotal(totals.total);
    setError("");
    setNotice("");

    if (method === "cash") {
      setCashStep("tender");
      return;
    }

    setCardStep("reference");
  }

  function closePaymentModal() {
    setPaymentModal(null);
    setError("");
    setNotice("");
  }

  function openRemoveCartLineModal(item: Item) {
    setCartLinePendingRemoval(item);
  }

  function closeRemoveCartLineModal() {
    setCartLinePendingRemoval(null);
  }

  function confirmRemoveCartLine() {
    if (!cartLinePendingRemoval) {
      return;
    }

    removeCartLine(cartLinePendingRemoval.id);
    setCartLinePendingRemoval(null);
  }

  function computeCashChange() {
    setError("");

    if (cashTendered < modalTotal) {
      setError("Tendered cash must cover the total.");
      return;
    }

    setCashStep("change");
  }

  async function completeCashPayment() {
    setError("");
    setNotice("");

    try {
      const transaction = await checkout({
        paymentMethod: "cash",
        paymentAmount: cashTendered,
        referenceId: "",
        transactionId: pendingTransactionId,
      });

      setCashReceived("");
      setPendingTransactionId(createId("txn"));
      setNotice(`${transaction.transactionNumber} completed.`);
      setCashStep("complete");
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
    }
  }

  function moveToCardConfirmation() {
    setError("");

    if (!referenceId.trim()) {
      setError("Reference ID is required.");
      return;
    }

    setCardStep("confirm");
  }

  async function completeCardPayment() {
    setError("");
    setNotice("");

    try {
      const transaction = await checkout({
        paymentMethod: "card",
        paymentAmount: modalTotal,
        referenceId,
        transactionId: pendingTransactionId,
      });

      setReferenceId("");
      setPendingTransactionId(createId("txn"));
      setNotice(`${transaction.transactionNumber} completed.`);
      setCardStep("complete");
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <CategoryTab
            active={selectedCategoryId === "all"}
            label="All"
            onClick={() => setSelectedCategoryId("all")}
          />
          {categories.map((category) => (
            <CategoryTab
              key={category.id}
              active={selectedCategoryId === category.id}
              label={category.name}
              color={category.defaultColor}
              onClick={() => setSelectedCategoryId(category.id)}
            />
          ))}
          {hasUncategorized && (
            <CategoryTab
              active={selectedCategoryId === "uncategorized"}
              label="Uncategorized"
              onClick={() => setSelectedCategoryId("uncategorized")}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const category = categories.find((entry) => entry.id === item.categoryId);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => addToCart(item.id)}
                className="relative min-h-36 rounded-lg border border-white/80 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                style={{ backgroundColor: category?.defaultColor ?? categoryFallback }}
              >
                <span className="absolute inset-3 grid place-items-center">
                  <span>
                    <span className="block text-lg font-bold leading-snug text-stone-950">
                      {item.name}
                    </span>
                    <span className="mt-2 block text-base font-semibold text-stone-700">
                      {formatPeso(item.price)}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm lg:sticky lg:top-24 lg:self-start">
        <div className="border-b border-stone-200 px-3 py-2">
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
                    {line.item.name}{" "}
                    <span className="font-medium text-stone-500">({formatPeso(line.item.price)})</span>
                  </p>
                  <IconButton label={`Add ${line.item.name}`} onClick={() => incrementCartLine(line.itemId)}>
                    <Plus size={15} />
                  </IconButton>
                  <span className="text-center text-sm font-bold">{line.quantity}</span>
                  <IconButton label={`Remove one ${line.item.name}`} onClick={() => decrementCartLine(line.itemId)}>
                    <Minus size={15} />
                  </IconButton>
                  <IconButton
                    label={`Remove ${line.item.name}`}
                    tone="danger"
                    onClick={() => openRemoveCartLineModal(line.item)}
                  >
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
              <SummaryLine
                key={adjustment.adjustmentId}
                label={adjustment.label}
                value={formatPeso(adjustment.computedAmount)}
              />
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2">
              <span className="text-sm font-bold text-stone-700">Total Amount</span>
              <span className="text-2xl font-bold">{formatPeso(totals.total)}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PaymentButton
              active={activePaymentMethod === "cash"}
              disabled={!settings.cashEnabled || cartRows.length === 0}
              icon={<Banknote size={18} />}
              label="Cash Tender"
              onClick={() => openPaymentModal("cash")}
            />
            <PaymentButton
              active={activePaymentMethod === "card"}
              disabled={!settings.cardEnabled || cartRows.length === 0}
              icon={<CreditCard size={18} />}
              label="Card"
              onClick={() => openPaymentModal("card")}
            />
          </div>
        </div>
      </aside>

      {paymentModal && (
        <PaymentModal title={paymentModal === "cash" ? "Cash Tender" : "Card Payment"} onClose={closePaymentModal}>
          {paymentModal === "cash" ? (
            <div className="grid gap-4">
              {cashStep === "complete" ? (
                <CompleteNotice notice={notice} total={modalTotal} />
              ) : (
                <>
                  <SummaryLine label="Total" value={formatPeso(modalTotal)} />
                  <label className="block text-sm font-semibold text-stone-700">
                    Tendered
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 text-lg font-semibold outline-none focus:border-amber-700"
                      placeholder="0.00"
                    />
                  </label>
                  {cashStep === "change" && (
                    <div className="rounded-md bg-emerald-50 px-3 py-3">
                      <SummaryLine label="Change" value={formatPeso(cashChange)} />
                    </div>
                  )}
                  {error && <ErrorNotice message={error} />}
                  {cashStep === "tender" ? (
                    <ModalAction icon={<Banknote size={18} />} label="Compute Change" onClick={computeCashChange} />
                  ) : (
                    <ModalAction icon={<Check size={18} />} label="Complete" onClick={() => void completeCashPayment()} />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {cardStep === "complete" ? (
                <CompleteNotice notice={notice} total={modalTotal} />
              ) : cardStep === "confirm" ? (
                <>
                  <div className="rounded-md bg-stone-50 px-3 py-3">
                    <SummaryLine label="Reference ID" value={referenceId.trim()} />
                    <SummaryLine label="Total Amount" value={formatPeso(modalTotal)} />
                  </div>
                  {error && <ErrorNotice message={error} />}
                  <ModalAction icon={<Check size={18} />} label="Confirm Payment" onClick={() => void completeCardPayment()} />
                </>
              ) : (
                <>
                  <SummaryLine label="Total Amount" value={formatPeso(modalTotal)} />
                  <label className="block text-sm font-semibold text-stone-700">
                    Reference ID
                    <input
                      autoFocus
                      type="text"
                      value={referenceId}
                      onChange={(event) => setReferenceId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
                      placeholder="ABC123"
                    />
                  </label>
                  {error && <ErrorNotice message={error} />}
                  <ModalAction icon={<CreditCard size={18} />} label="Continue" onClick={moveToCardConfirmation} />
                </>
              )}
            </div>
          )}
        </PaymentModal>
      )}

      {cartLinePendingRemoval && (
        <PaymentModal title="Remove Item" onClose={closeRemoveCartLineModal}>
          <div className="grid gap-4">
            <p className="text-sm font-semibold text-stone-700">
              Remove <span className="font-bold text-stone-950">{cartLinePendingRemoval.name}</span> from the cart?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeRemoveCartLineModal}
                className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveCartLine}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white transition hover:bg-red-700"
              >
                <Trash2 size={17} />
                Remove
              </button>
            </div>
          </div>
        </PaymentModal>
      )}
    </section>
  );
}

function CategoryTab({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-bold transition ${
        active ? "border-stone-950 text-stone-950 shadow-sm" : "border-transparent text-stone-700"
      }`}
      style={{ backgroundColor: color ?? categoryFallback }}
    >
      {label}
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-full transition ${
        tone === "danger" ? "text-red-600 hover:bg-red-50" : "text-stone-700 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

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

function PaymentModal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Close payment modal"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-3 font-bold text-white transition hover:bg-stone-800"
    >
      {icon}
      {label}
    </button>
  );
}

function CompleteNotice({ notice, total }: { notice: string; total: number }) {
  return (
    <div className="rounded-lg bg-emerald-50 px-4 py-5 text-center">
      <Check className="mx-auto text-emerald-700" size={28} />
      <p className="mt-2 font-bold text-emerald-900">{notice || "Payment completed."}</p>
      <p className="mt-1 text-sm font-semibold text-emerald-700">Total Amount: {formatPeso(total)}</p>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
