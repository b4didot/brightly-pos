import { BadgePercent, Banknote, Check, CreditCard, X } from "lucide-react";
import type { CardStep, CashStep } from "../OrderPage";
import type { CartTotals, PaymentMethod } from "../../types";
import type { VatBreakdown } from "../../utils/vat";
import { formatPeso, formatSignedPeso } from "../../utils/money";
import { CompleteNotice, ErrorNotice, ModalAction, ModalFrame, SummaryLine, VatBreakdownLines } from "./OrderUi";

export function PaymentModal({
  cardStep,
  cashChange,
  cashReceived,
  cashStep,
  discountsEnabled,
  error,
  method,
  modalTotal,
  modalTotals,
  notice,
  referenceId,
  vatBreakdown,
  onCashReceivedChange,
  onClearDiscount,
  onClose,
  onCompleteCardPayment,
  onCompleteCashPayment,
  onConfirmPaymentReview,
  onComputeCashChange,
  onOpenDiscountModal,
  onMoveToCardConfirmation,
  onReferenceIdChange,
}: {
  cardStep: CardStep;
  cashChange: number;
  cashReceived: string;
  cashStep: CashStep;
  discountsEnabled: boolean;
  error: string;
  method: PaymentMethod;
  modalTotal: number;
  modalTotals: CartTotals;
  notice: string;
  referenceId: string;
  vatBreakdown: VatBreakdown;
  onCashReceivedChange: (value: string) => void;
  onClearDiscount: () => void;
  onClose: () => void;
  onCompleteCardPayment: () => void;
  onCompleteCashPayment: () => void;
  onConfirmPaymentReview: () => void;
  onComputeCashChange: () => void;
  onOpenDiscountModal: () => void;
  onMoveToCardConfirmation: () => void;
  onReferenceIdChange: (value: string) => void;
}) {
  const isReviewStep = method === "cash" ? cashStep === "review" : cardStep === "review";

  return (
    <ModalFrame title={method === "cash" ? "Cash Tender" : "Card Payment"} onClose={onClose}>
      {isReviewStep ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-md bg-stone-50 px-3 py-3">
            <SummaryLine label="Subtotal" value={formatPeso(modalTotals.subtotal)} />
            {modalTotals.appliedDiscount && (
              <SummaryLine label={modalTotals.appliedDiscount.label} value={`-${formatPeso(modalTotals.discountTotal)}`} />
            )}
            {modalTotals.appliedAdjustments.map((adjustment) => (
              <SummaryLine
                key={adjustment.adjustmentId}
                label={adjustment.label}
                value={formatSignedPeso(adjustment.computedAmount)}
              />
            ))}
            <VatBreakdownLines
              vatAmount={vatBreakdown.vatAmount}
              vatEnabled={vatBreakdown.vatEnabled}
              vatableSales={vatBreakdown.vatableSales}
            />
            <div className="mt-2 border-t border-stone-200 pt-2">
              <SummaryLine label="Total" value={formatPeso(modalTotal)} />
            </div>
          </div>
          {discountsEnabled && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onOpenDiscountModal}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 hover:text-amber-800"
              >
                <BadgePercent size={17} />
                {modalTotals.appliedDiscount ? "Change Discount" : "Add Discount"}
              </button>
              <button
                type="button"
                disabled={!modalTotals.appliedDiscount}
                onClick={onClearDiscount}
                className="grid h-11 w-11 place-items-center rounded-lg border border-stone-300 text-stone-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-300"
                aria-label="Clear discount"
              >
                <X size={17} />
              </button>
            </div>
          )}
          {error && <ErrorNotice message={error} />}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-50">
              Cancel
            </button>
            <ModalAction icon={<Check size={18} />} label="Confirm" onClick={onConfirmPaymentReview} />
          </div>
        </div>
      ) : null}
      {!isReviewStep && method === "cash" ? (
        <div className="grid gap-4">
          {cashStep === "complete" ? (
            <CompleteNotice notice={notice} total={modalTotal} />
          ) : (
            <>
              <SummaryLine label="Total" value={formatPeso(modalTotal)} />
              <VatBreakdownLines
                vatAmount={vatBreakdown.vatAmount}
                vatEnabled={vatBreakdown.vatEnabled}
                vatableSales={vatBreakdown.vatableSales}
              />
              <label className="block text-sm font-semibold text-stone-700">
                Tendered
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived}
                  onChange={(event) => onCashReceivedChange(event.target.value)}
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
                <ModalAction icon={<Banknote size={18} />} label="Compute Change" onClick={onComputeCashChange} />
              ) : (
                <ModalAction icon={<Check size={18} />} label="Complete" onClick={onCompleteCashPayment} />
              )}
            </>
          )}
        </div>
      ) : !isReviewStep ? (
        <div className="grid gap-4">
          {cardStep === "complete" ? (
            <CompleteNotice notice={notice} total={modalTotal} />
          ) : cardStep === "confirm" ? (
            <>
              <div className="rounded-md bg-stone-50 px-3 py-3">
                <SummaryLine label="Reference ID" value={referenceId.trim()} />
                <VatBreakdownLines
                  vatAmount={vatBreakdown.vatAmount}
                  vatEnabled={vatBreakdown.vatEnabled}
                  vatableSales={vatBreakdown.vatableSales}
                />
                <SummaryLine label="Total" value={formatPeso(modalTotal)} />
              </div>
              {error && <ErrorNotice message={error} />}
              <ModalAction icon={<Check size={18} />} label="Confirm Payment" onClick={onCompleteCardPayment} />
            </>
          ) : (
            <>
              <SummaryLine label="Total" value={formatPeso(modalTotal)} />
              <VatBreakdownLines
                vatAmount={vatBreakdown.vatAmount}
                vatEnabled={vatBreakdown.vatEnabled}
                vatableSales={vatBreakdown.vatableSales}
              />
              <label className="block text-sm font-semibold text-stone-700">
                Reference ID
                <input
                  autoFocus
                  type="text"
                  value={referenceId}
                  onChange={(event) => onReferenceIdChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
                  placeholder="ABC123"
                />
              </label>
              {error && <ErrorNotice message={error} />}
              <ModalAction icon={<CreditCard size={18} />} label="Continue" onClick={onMoveToCardConfirmation} />
            </>
          )}
        </div>
      ) : null}
    </ModalFrame>
  );
}
