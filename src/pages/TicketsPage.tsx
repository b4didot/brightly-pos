import { Ban, Check, ChevronDown } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../components/Modal";
import { usePosStore } from "../store/usePosStore";
import type { Transaction, TransactionItem } from "../types";
import { formatPeso } from "../utils/money";

function TicketCard({
  transaction,
  items,
  formatTime,
  onMarkServed,
  onVoid,
}: {
  transaction: Transaction;
  items: TransactionItem[];
  formatTime: (iso: string) => string;
  onMarkServed: () => void;
  onVoid: () => void;
}) {
  const isVoided = transaction.isVoided;

  return (
    <div
      className={`rounded-lg border bg-white px-4 py-3 shadow-sm ${
        isVoided
          ? "border-red-200 opacity-75"
          : transaction.isServed
            ? "border-stone-200 opacity-60"
            : "border-stone-300"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-stone-950">
            {transaction.transactionNumber}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              transaction.orderType === "dine-in"
                ? "bg-amber-100 text-amber-800"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            {transaction.orderType === "dine-in" ? "Dine In" : "Take Out"}
          </span>
          {isVoided && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              Voided
            </span>
          )}
        </div>
        <span className="text-xs text-stone-500">{formatTime(transaction.createdAt)}</span>
      </div>

      <div className="mb-3 space-y-2">
        {items.map((item) => {
          const modifiers = item.selectedModifiers
            .map((modifier) => `${modifier.label}: ${modifier.selectedOption}`)
            .join(" - ");
          const addOns = item.selectedAddOns.map((addOn) => addOn.name).join(" - ");

          return (
            <div key={item.id} className="min-w-0 text-sm text-stone-700">
              <p className="truncate">
                <span className="font-semibold">{item.quantity}x</span> {item.itemNameSnapshot}
              </p>
              {(item.variantNameSnapshot || modifiers || addOns) && (
                <div className="mt-0.5 space-y-0.5 border-l-2 border-stone-200 pl-3 text-xs text-stone-500">
                  {item.variantNameSnapshot && <p className="truncate">Variant: {item.variantNameSnapshot}</p>}
                  {modifiers && <p className="truncate">{modifiers}</p>}
                  {addOns && <p className="truncate">Add-ons: {addOns}</p>}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p className="text-sm text-stone-400">No items</p>}
      </div>

      {isVoided && transaction.voidReason && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
          <span className="font-bold">Void reason:</span> {transaction.voidReason}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-stone-950">
          {formatPeso(transaction.totalAmount)}
          <span className="ml-1 text-xs font-medium capitalize text-stone-500">
            - {transaction.paymentMethod}
          </span>
        </span>

        {isVoided ? (
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
            <Ban size={12} />
            Voided
          </span>
        ) : transaction.isServed ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onVoid}
              className="flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700 transition hover:border-red-600 hover:bg-red-50"
            >
              <Ban size={12} />
              Void
            </button>
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <Check size={12} />
              Served
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onVoid}
              className="flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700 transition hover:border-red-600 hover:bg-red-50"
            >
              <Ban size={12} />
              Void
            </button>
            <button
              type="button"
              onClick={onMarkServed}
              className="flex items-center gap-1 rounded-full border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700 transition hover:border-emerald-600 hover:bg-emerald-50"
            >
              <Check size={12} />
              Mark Served
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TicketsPage() {
  const [isPendingOpen, setIsPendingOpen] = useState(true);
  const [isServedOpen, setIsServedOpen] = useState(false);
  const [isVoidedOpen, setIsVoidedOpen] = useState(false);
  const [voidingTransaction, setVoidingTransaction] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const transactions = usePosStore((state) => state.transactions);
  const transactionItems = usePosStore((state) => state.transactionItems);
  const markTransactionServed = usePosStore((state) => state.markTransactionServed);
  const voidTransaction = usePosStore((state) => state.voidTransaction);

  const pending = transactions.filter((txn) => !txn.isServed && !txn.isVoided);
  const served = transactions.filter((txn) => txn.isServed && !txn.isVoided);
  const voided = transactions.filter((txn) => txn.isVoided);

  function getItemsForTransaction(transactionId: string) {
    return transactionItems.filter((item) => item.transactionId === transactionId);
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function openVoidModal(transaction: Transaction) {
    setVoidingTransaction(transaction);
    setVoidReason("");
    setVoidError("");
  }

  function closeVoidModal() {
    setVoidingTransaction(null);
    setVoidReason("");
    setVoidError("");
  }

  async function submitVoid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = voidReason.trim();

    if (!voidingTransaction) {
      return;
    }

    if (reason.length === 0) {
      setVoidError("Enter a reason before voiding this order.");
      return;
    }

    await voidTransaction(voidingTransaction.id, reason);
    closeVoidModal();
  }

  return (
    <section className="mx-auto max-w-3xl px-3 pb-8 pt-3">
      <h1 className="mb-4 text-lg font-bold text-stone-950">Tickets</h1>

      {transactions.length === 0 && (
        <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-stone-300 text-sm text-stone-500">
          No orders yet
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setIsPendingOpen((isOpen) => !isOpen)}
            className="mb-2 flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs font-bold uppercase tracking-wide text-stone-500 transition hover:bg-stone-100"
            aria-expanded={isPendingOpen}
          >
            <span>Pending - {pending.length}</span>
            <ChevronDown
              size={16}
              className={`shrink-0 transition-transform ${isPendingOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isPendingOpen && (
            <div className="grid gap-3">
              {pending.map((txn) => (
                <TicketCard
                  key={txn.id}
                  transaction={txn}
                  items={getItemsForTransaction(txn.id)}
                  formatTime={formatTime}
                  onMarkServed={() => void markTransactionServed(txn.id)}
                  onVoid={() => openVoidModal(txn)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {served.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setIsServedOpen((isOpen) => !isOpen)}
            className="mb-2 flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs font-bold uppercase tracking-wide text-stone-500 transition hover:bg-stone-100"
            aria-expanded={isServedOpen}
          >
            <span>Served - {served.length}</span>
            <ChevronDown
              size={16}
              className={`shrink-0 transition-transform ${isServedOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isServedOpen && (
            <div className="grid gap-3">
              {served.map((txn) => (
                <TicketCard
                  key={txn.id}
                  transaction={txn}
                  items={getItemsForTransaction(txn.id)}
                  formatTime={formatTime}
                  onMarkServed={() => void markTransactionServed(txn.id)}
                  onVoid={() => openVoidModal(txn)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {voided.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setIsVoidedOpen((isOpen) => !isOpen)}
            className="mb-2 flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs font-bold uppercase tracking-wide text-stone-500 transition hover:bg-stone-100"
            aria-expanded={isVoidedOpen}
          >
            <span>Voided - {voided.length}</span>
            <ChevronDown
              size={16}
              className={`shrink-0 transition-transform ${isVoidedOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isVoidedOpen && (
            <div className="grid gap-3">
              {voided.map((txn) => (
                <TicketCard
                  key={txn.id}
                  transaction={txn}
                  items={getItemsForTransaction(txn.id)}
                  formatTime={formatTime}
                  onMarkServed={() => void markTransactionServed(txn.id)}
                  onVoid={() => openVoidModal(txn)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={voidingTransaction !== null}
        onClose={closeVoidModal}
        title={`Void ${voidingTransaction?.transactionNumber ?? "Order"}`}
      >
        <form onSubmit={(event) => void submitVoid(event)} className="grid gap-3">
          <label className="text-sm font-semibold text-stone-700">
            Reason
            <textarea
              value={voidReason}
              onChange={(event) => {
                setVoidReason(event.target.value);
                setVoidError("");
              }}
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-600"
              autoFocus
            />
          </label>
          {voidError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {voidError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeVoidModal}
              className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold text-stone-700 transition hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 font-bold text-white transition hover:bg-red-700"
            >
              <Ban size={16} />
              Void Order
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
