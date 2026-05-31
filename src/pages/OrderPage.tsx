import { useMemo, useRef, useState } from "react";
import { usePosStore } from "../store/usePosStore";
import type { AppliedDiscount, CartTotals, Item, PaymentMethod, SelectedAddOn, SelectedModifier } from "../types";
import { calculateCartTotals } from "../utils/cart";
import { createId } from "../utils/id";
import { parsePesoInput } from "../utils/money";
import { calculateInclusiveVat } from "../utils/vat";
import type { CartSheetState } from "../components/CartSheet";
import { CartPanel } from "./order/CartPanel";
import { CustomizationModal } from "./order/CustomizationModal";
import { DiscountModal } from "./order/DiscountModal";
import { MenuGrid } from "./order/MenuGrid";
import { PaymentModal } from "./order/PaymentModal";
import { RemoveItemModal } from "./order/RemoveItemModal";

export type CashStep = "review" | "tender" | "change" | "complete";
export type CardStep = "review" | "reference" | "confirm" | "complete";

export function OrderPage() {
  const items = usePosStore((state) => state.items);
  const adjustments = usePosStore((state) => state.adjustments);
  const settings = usePosStore((state) => state.settings);
  const cart = usePosStore((state) => state.cart);
  const cartDiscount = usePosStore((state) => state.cartDiscount);
  const discountTemplates = usePosStore((state) => state.discountTemplates);
  const itemVariants = usePosStore((state) => state.itemVariants);
  const itemModifiers = usePosStore((state) => state.itemModifiers);
  const itemAddOns = usePosStore((state) => state.itemAddOns);
  const modifiers = usePosStore((state) => state.modifiers);
  const pendingOrderType = usePosStore((state) => state.pendingOrderType);
  const setPendingOrderType = usePosStore((state) => state.setPendingOrderType);
  const addToCart = usePosStore((state) => state.addToCart);
  const addToCartWithCustomization = usePosStore((state) => state.addToCartWithCustomization);
  const removeCartLine = usePosStore((state) => state.removeCartLine);
  const applyCartDiscount = usePosStore((state) => state.applyCartDiscount);
  const clearCartDiscount = usePosStore((state) => state.clearCartDiscount);
  const checkout = usePosStore((state) => state.checkout);
  const totals = useMemo(() => calculateCartTotals(cart, items, adjustments, cartDiscount), [cart, items, adjustments, cartDiscount]);
  const vatBreakdown = useMemo(() => calculateInclusiveVat(totals.total, settings), [settings, totals.total]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(settings.cashEnabled ? "cash" : "card");
  const [paymentModal, setPaymentModal] = useState<PaymentMethod | null>(null);
  const [cashStep, setCashStep] = useState<CashStep>("review");
  const [cardStep, setCardStep] = useState<CardStep>("review");
  const [cashReceived, setCashReceived] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [modalTotal, setModalTotal] = useState(0);
  const [modalTotals, setModalTotals] = useState<CartTotals>({
    subtotal: 0,
    appliedDiscount: null,
    discountTotal: 0,
    appliedAdjustments: [],
    adjustmentsTotal: 0,
    total: 0,
  });
  const [cartLinePendingRemoval, setCartLinePendingRemoval] = useState<Item | null>(null);
  const [pendingTransactionId, setPendingTransactionId] = useState(() => createId("txn"));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cartSheetState, setCartSheetState] = useState<CartSheetState>("minimized");
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);
  const [customizingItem, setCustomizingItem] = useState<Item | null>(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
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

  function triggerAnimation(item: Item) {
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

  function handleAddToCart(item: Item) {
    const itemHasVariants = itemVariants.some((variant) => variant.itemId === item.id);
    const itemHasModifiers = itemModifiers.some((itemModifier) => itemModifier.itemId === item.id);
    const itemHasAddOns = itemAddOns.some((itemAddOn) => itemAddOn.itemId === item.id);

    if (itemHasVariants || itemHasModifiers || itemHasAddOns) {
      setCustomizingItem(item);
      return;
    }

    addToCart(item.id);
    triggerAnimation(item);
  }

  function handleCustomizationConfirm(input: {
    variantId: string | null;
    variantName: string | null;
    variantPrice: number | null;
    selectedModifiers: SelectedModifier[];
    selectedAddOns: SelectedAddOn[];
  }) {
    if (!customizingItem) {
      return;
    }

    addToCartWithCustomization({ itemId: customizingItem.id, ...input });
    triggerAnimation(customizingItem);
    setCustomizingItem(null);
  }

  function openPaymentModal(method: PaymentMethod) {
    setPaymentMethod(method);
    setPaymentModal(method);
    setModalTotal(totals.total);
    setModalTotals(totals);
    setError("");
    setNotice("");

    if (method === "cash") {
      setCashStep("review");
      return;
    }

    setCardStep("review");
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

    const linesToRemove = cart.filter((line) => line.itemId === cartLinePendingRemoval.id);
    linesToRemove.forEach((line) => removeCartLine(line.id));
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

  function confirmPaymentReview() {
    setError("");

    if (paymentModal === "cash") {
      setCashStep("tender");
      return;
    }

    setCardStep("reference");
  }

  async function completeCashPayment() {
    setError("");
    setNotice("");

    try {
      const transaction = await checkout({
        paymentMethod: "cash",
        paymentAmount: cashTendered,
        referenceId: "",
        orderType: pendingOrderType,
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
        orderType: pendingOrderType,
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
    <section className="order-layout grid w-full max-w-full overflow-x-hidden gap-3 px-3 pb-20 pt-3 md:grid-cols-[minmax(0,1fr)_340px] md:pb-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <MenuGrid animatingItemId={animatingItemId} cartSheetState={cartSheetState} onAddToCart={handleAddToCart} />

      <CartPanel
        activePaymentMethod={activePaymentMethod}
        cart={cart}
        sheetState={cartSheetState}
        totals={totals}
        vatBreakdown={vatBreakdown}
        orderType={pendingOrderType}
        onOpenPaymentModal={openPaymentModal}
        onOpenDiscountModal={() => setDiscountModalOpen(true)}
        onRequestRemoveLine={setCartLinePendingRemoval}
        onClearDiscount={clearCartDiscount}
        onSetOrderType={setPendingOrderType}
        onToggleCart={() =>
          setCartSheetState((current) => (current === "minimized" ? "half" : current === "half" ? "full" : "minimized"))
        }
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
          modalTotals={modalTotals}
          notice={notice}
          referenceId={referenceId}
          vatBreakdown={modalVatBreakdown}
          onClose={closePaymentModal}
          onConfirmPaymentReview={confirmPaymentReview}
          onCompleteCardPayment={() => void completeCardPayment()}
          onCompleteCashPayment={() => void completeCashPayment()}
          onComputeCashChange={computeCashChange}
          onMoveToCardConfirmation={moveToCardConfirmation}
          onReferenceIdChange={setReferenceId}
          onCashReceivedChange={setCashReceived}
        />
      )}

      {discountModalOpen && (
        <DiscountModal
          currentDiscount={totals.appliedDiscount}
          discountTemplates={discountTemplates}
          subtotal={totals.subtotal}
          onApplyDiscount={(discount: AppliedDiscount) => applyCartDiscount(discount)}
          onClearDiscount={clearCartDiscount}
          onClose={() => setDiscountModalOpen(false)}
        />
      )}

      {customizingItem &&
        (() => {
          const variants = itemVariants.filter((variant) => variant.itemId === customizingItem.id);
          const linkedModifierIds = itemModifiers
            .filter((itemModifier) => itemModifier.itemId === customizingItem.id)
            .map((itemModifier) => itemModifier.modifierId);
          const linkedModifiers = modifiers.filter((modifier) => linkedModifierIds.includes(modifier.id));
          const linkedAddOnIds = itemAddOns
            .filter((itemAddOn) => itemAddOn.itemId === customizingItem.id)
            .map((itemAddOn) => itemAddOn.addOnItemId);
          const linkedAddOns = items.filter((item) => linkedAddOnIds.includes(item.id) && item.isAddOn && !item.isOutOfStock);

          return (
            <CustomizationModal
              item={customizingItem}
              variants={variants}
              modifiers={linkedModifiers}
              addOns={linkedAddOns}
              onClose={() => setCustomizingItem(null)}
              onAddToCart={handleCustomizationConfirm}
            />
          );
        })()}

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
