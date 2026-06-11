import { Ban, Check, Clock3, List } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Modal } from "../components/Modal";
import { usePosStore } from "../store/usePosStore";
import type { Transaction, TransactionItem } from "../types";
import { formatPeso } from "../utils/money";

type TicketFilter = "pending" | "served" | "voided" | "all";
type QueuedTicket = {
  transaction: Transaction;
  queueNumber?: number;
};

function TicketCard({
  transaction,
  items,
  queueNumber,
  formatTime,
  onMarkServed,
  onVoid,
}: {
  transaction: Transaction;
  items: TransactionItem[];
  queueNumber?: number;
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
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {queueNumber !== undefined && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              Order {queueNumber}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              transaction.orderType === "dine-in"
                ? "bg-amber-100 text-amber-800"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            {transaction.orderType === "dine-in" ? "Dine In" : "Take Out"}
          </span>
          <span className="text-sm font-bold text-stone-950">
            {transaction.transactionNumber}
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
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("pending");
  const [voidingTransaction, setVoidingTransaction] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const transactions = usePosStore((state) => state.transactions);
  const transactionItems = usePosStore((state) => state.transactionItems);
  const markTransactionServed = usePosStore((state) => state.markTransactionServed);
  const voidTransaction = usePosStore((state) => state.voidTransaction);

  const sortByArrival = (left: Transaction, right: Transaction) =>
    left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
  const sortByNewestArrival = (left: Transaction, right: Transaction) =>
    right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id);
  const allTickets = [...transactions].sort(sortByArrival);
  const allTicketsNewestFirst = [...transactions].sort(sortByNewestArrival);
  const pending = allTickets.filter((txn) => !txn.isServed && !txn.isVoided);
  const served = allTickets.filter((txn) => txn.isServed && !txn.isVoided);
  const voided = allTickets.filter((txn) => txn.isVoided);
  const queueNumbersByTransactionId = new Map(pending.map((transaction, index) => [transaction.id, index + 1]));
  const ticketFilters: { id: TicketFilter; label: string; count: number }[] = [
    { id: "pending", label: "Pending", count: pending.length },
    { id: "served", label: "Served", count: served.length },
    { id: "voided", label: "Voided", count: voided.length },
    { id: "all", label: "All", count: transactions.length },
  ];
  const ticketFilterIcons = {
    pending: Clock3,
    served: Check,
    voided: Ban,
    all: List,
  };
  const ticketFilterColors: Record<TicketFilter, string> = {
    pending: "#fef3c7",
    served: "#d1fae5",
    voided: "#fee2e2",
    all: "#dbeafe",
  };

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

  function renderTicketCard({ transaction, queueNumber }: QueuedTicket) {
    return (
      <TicketCard
        key={transaction.id}
        transaction={transaction}
        items={getItemsForTransaction(transaction.id)}
        queueNumber={queueNumber}
        formatTime={formatTime}
        onMarkServed={() => void markTransactionServed(transaction.id)}
        onVoid={() => openVoidModal(transaction)}
      />
    );
  }

  function renderTicketColumns(tickets: QueuedTicket[], columnCount: number) {
    return Array.from({ length: columnCount }, (_, columnIndex) => (
      <div key={columnIndex} className="grid content-start gap-3">
        {tickets.filter((_, index) => index % columnCount === columnIndex).map(renderTicketCard)}
      </div>
    ));
  }

  function renderTicketList(tickets: Transaction[]) {
    if (tickets.length === 0) {
      return null;
    }

    const queuedTickets = tickets.map((transaction) => ({
      transaction,
      queueNumber: queueNumbersByTransactionId.get(transaction.id),
    }));

    return (
      <>
        <div className="ticket-list-mobile gap-3">
          {queuedTickets.map(renderTicketCard)}
        </div>
        <div className="ticket-list-tablet gap-3">
          {renderTicketColumns(queuedTickets, 2)}
        </div>
        <div className="ticket-list-desktop gap-3">
          {renderTicketColumns(queuedTickets, 3)}
        </div>
      </>
    );
  }

  const visibleTickets =
    ticketFilter === "pending"
      ? pending
      : ticketFilter === "served"
        ? served
        : ticketFilter === "voided"
          ? voided
          : allTicketsNewestFirst;

  return (
    <section className="mx-auto max-w-7xl px-3 pb-8 pt-3">
      <div className="mb-4 flex min-w-0 items-center gap-3 overflow-hidden">
        <h1 className="shrink-0 text-lg font-bold text-stone-950">Tickets</h1>
        <div className="ml-auto flex min-w-0 flex-1 justify-end gap-2 overflow-x-auto pb-1">
          {ticketFilters.map((filter) => {
            const isSelected = ticketFilter === filter.id;
            const FilterIcon = ticketFilterIcons[filter.id];

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTicketFilter(filter.id)}
                className={`inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold transition ${
                  isSelected ? "border-stone-950 text-stone-950 shadow-sm" : "border-transparent text-stone-700"
                }`}
                aria-pressed={isSelected}
                aria-label={`${filter.label} tickets (${filter.count})`}
                title={`${filter.label} (${filter.count})`}
                style={{ backgroundColor: ticketFilterColors[filter.id] }}
              >
                <FilterIcon size={13} aria-hidden="true" />
                <span>{filter.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {transactions.length === 0 && (
        <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-stone-300 text-sm text-stone-500">
          No orders yet
        </div>
      )}

      {renderTicketList(visibleTickets)}

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
