import { Check } from "lucide-react";
import { usePosStore } from "../store/usePosStore";
import type { Transaction, TransactionItem } from "../types";
import { formatPeso } from "../utils/money";

function TicketCard({
  transaction,
  items,
  formatTime,
  onMarkServed,
}: {
  transaction: Transaction;
  items: TransactionItem[];
  formatTime: (iso: string) => string;
  onMarkServed: () => void;
}) {
  return (
    <div
      className={`rounded-lg border bg-white px-4 py-3 shadow-sm ${
        transaction.isServed ? "border-stone-200 opacity-60" : "border-stone-300"
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

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-stone-950">
          {formatPeso(transaction.totalAmount)}
          <span className="ml-1 text-xs font-medium capitalize text-stone-500">
            - {transaction.paymentMethod}
          </span>
        </span>

        {transaction.isServed ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <Check size={12} />
            Served
          </span>
        ) : (
          <button
            type="button"
            onClick={onMarkServed}
            className="flex items-center gap-1 rounded-full border border-stone-300 px-2.5 py-1 text-xs font-bold text-stone-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Check size={12} />
            Mark Served
          </button>
        )}
      </div>
    </div>
  );
}

export function TicketsPage() {
  const transactions = usePosStore((state) => state.transactions);
  const transactionItems = usePosStore((state) => state.transactionItems);
  const markTransactionServed = usePosStore((state) => state.markTransactionServed);

  const pending = transactions.filter((txn) => !txn.isServed);
  const served = transactions.filter((txn) => txn.isServed);

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
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
            Pending - {pending.length}
          </p>
          <div className="grid gap-3">
            {pending.map((txn) => (
              <TicketCard
                key={txn.id}
                transaction={txn}
                items={getItemsForTransaction(txn.id)}
                formatTime={formatTime}
                onMarkServed={() => void markTransactionServed(txn.id)}
              />
            ))}
          </div>
        </div>
      )}

      {served.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
            Served - {served.length}
          </p>
          <div className="grid gap-3">
            {served.map((txn) => (
              <TicketCard
                key={txn.id}
                transaction={txn}
                items={getItemsForTransaction(txn.id)}
                formatTime={formatTime}
                onMarkServed={() => void markTransactionServed(txn.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
