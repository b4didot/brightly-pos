import { Banknote, Check, CreditCard } from "lucide-react";
import type { CardStep, CashStep } from "../OrderPage";
import type { PaymentMethod } from "../../types";
import type { VatBreakdown } from "../../utils/vat";
import { formatPeso } from "../../utils/money";
import { CompleteNotice, ErrorNotice, ModalAction, ModalFrame, SummaryLine, VatBreakdownLines } from "./OrderUi";

export function PaymentModal({
  cardStep,
  cashChange,
  cashReceived,
  cashStep,
  error,
  method,
  modalTotal,
  notice,
  referenceId,
  vatBreakdown,
  onCashReceivedChange,
  onClose,
  onCompleteCardPayment,
  onCompleteCashPayment,
  onComputeCashChange,
  onMoveToCardConfirmation,
  onReferenceIdChange,
}: {
  cardStep: CardStep;
  cashChange: number;
  cashReceived: string;
  cashStep: CashStep;
  error: string;
  method: PaymentMethod;
  modalTotal: number;
  notice: string;
  referenceId: string;
  vatBreakdown: VatBreakdown;
  onCashReceivedChange: (value: string) => void;
  onClose: () => void;
  onCompleteCardPayment: () => void;
  onCompleteCashPayment: () => void;
  onComputeCashChange: () => void;
  onMoveToCardConfirmation: () => void;
  onReferenceIdChange: (value: string) => void;
}) {
  return (
    <ModalFrame title={method === "cash" ? "Cash Tender" : "Card Payment"} onClose={onClose}>
      {method === "cash" ? (
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
      ) : (
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
      )}
    </ModalFrame>
  );
}
