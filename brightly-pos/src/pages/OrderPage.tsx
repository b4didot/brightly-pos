import { useMemo, useRef, useState } from "react";
import { usePosStore } from "../store/usePosStore";
import type { Item, PaymentMethod } from "../types";
import { calculateCartTotals } from "../utils/cart";
import { createId } from "../utils/id";
import { parsePesoInput } from "../utils/money";
import { calculateInclusiveVat } from "../utils/vat";
import { CartPanel } from "./order/CartPanel";
import { MenuGrid } from "./order/MenuGrid";
import { PaymentModal } from "./order/PaymentModal";
import { RemoveItemModal } from "./order/RemoveItemModal";

export type CashStep = "tender" | "change" | "complete";
export type CardStep = "reference" | "confirm" | "complete";

export function OrderPage() {
  const items = usePosStore((state) => state.items);
  const adjustments = usePosStore((state) => state.adjustments);
  const settings = usePosStore((state) => state.settings);
  const cart = usePosStore((state) => state.cart);
  const addToCart = usePosStore((state) => state.addToCart);
  const removeCartLine = usePosStore((state) => state.removeCartLine);
  const checkout = usePosStore((state) => state.checkout);
  const totals = useMemo(() => calculateCartTotals(cart, items, adjustments), [cart, items, adjustments]);
  const vatBreakdown = useMemo(() => calculateInclusiveVat(totals.total, settings), [settings, totals.total]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(settings.cashEnabled ? "cash" : "card");
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
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: "", show: false });
  const animationTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const cashTendered = parsePesoInput(cashReceived);
  const cashChange = Math.max(0, cashTendered - modalTotal);
  const modalVatBreakdown = calculateInclusiveVat(modalTotal, settings);
  const activePaymentMethod: PaymentMethod =
    paymentMethod === "cash" && settings.cashEnabled
      ? "cash"
      : paymentMethod === "card" && settings.cardEnabled
        ? "card"
        : settings.cashEnabled
          ? "cash"
          : "card";

  function showToast(message: string) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ message, show: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ message: "", show: false });
    }, 2000);
  }

  function handleAddToCart(item: Item) {
    addToCart(item.id);

    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current);
    }

    setAnimatingItemId(null);
    window.setTimeout(() => setAnimatingItemId(item.id), 0);
    animationTimerRef.current = window.setTimeout(() => {
      setAnimatingItemId(null);
    }, 600);
    showToast(`${item.name} added to cart`);
  }

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
    <section className="mx-auto grid max-w-7xl gap-3 px-3 pb-20 pt-3 md:grid-cols-[minmax(0,1fr)_340px] md:pb-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <MenuGrid animatingItemId={animatingItemId} onAddToCart={handleAddToCart} />

      <CartPanel
        activePaymentMethod={activePaymentMethod}
        cart={cart}
        isCartExpanded={isCartExpanded}
        pendingTransactionId={pendingTransactionId}
        totals={totals}
        vatBreakdown={vatBreakdown}
        onOpenPaymentModal={openPaymentModal}
        onRequestRemoveLine={setCartLinePendingRemoval}
        onToggleCart={() => setIsCartExpanded((current) => !current)}
      />

      {toast.show && (
        <div className="fixed bottom-20 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg md:bottom-4">
          {toast.message}
        </div>
      )}

      {paymentModal && (
        <PaymentModal
          cardStep={cardStep}
          cashChange={cashChange}
          cashReceived={cashReceived}
          cashStep={cashStep}
          error={error}
          method={paymentModal}
          modalTotal={modalTotal}
          notice={notice}
          referenceId={referenceId}
          vatBreakdown={modalVatBreakdown}
          onClose={closePaymentModal}
          onCompleteCardPayment={() => void completeCardPayment()}
          onCompleteCashPayment={() => void completeCashPayment()}
          onComputeCashChange={computeCashChange}
          onMoveToCardConfirmation={moveToCardConfirmation}
          onReferenceIdChange={setReferenceId}
          onCashReceivedChange={setCashReceived}
        />
      )}

      {cartLinePendingRemoval && (
        <RemoveItemModal
          item={cartLinePendingRemoval}
          onClose={() => setCartLinePendingRemoval(null)}
          onConfirm={confirmRemoveCartLine}
        />
      )}
    </section>
  );
}
