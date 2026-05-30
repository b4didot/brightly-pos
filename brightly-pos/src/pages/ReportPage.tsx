import { CalendarDays } from "lucide-react";
import { useMemo } from "react";
import * as XLSX from "xlsx";
import { usePosStore } from "../store/usePosStore";
import type { Transaction } from "../types";
import { formatDateTime, isWithinDateRange } from "../utils/dates";
import { downloadFile } from "../utils/download";
import { formatPeso, toPesoNumber } from "../utils/money";

export function ReportPage() {
  const transactions = usePosStore((state) => state.transactions);
  const transactionItems = usePosStore((state) => state.transactionItems);
  const reportStartDate = usePosStore((state) => state.reportStartDate);
  const reportEndDate = usePosStore((state) => state.reportEndDate);
  const setReportRange = usePosStore((state) => state.setReportRange);
  const filteredTransactions = useMemo(() => {
    const startDate = reportStartDate <= reportEndDate ? reportStartDate : reportEndDate;
    const endDate = reportStartDate <= reportEndDate ? reportEndDate : reportStartDate;

    return transactions.filter((transaction) =>
      isWithinDateRange(transaction.createdAt, startDate, endDate),
    );
  }, [reportEndDate, reportStartDate, transactions]);
  const reportTotals = filteredTransactions.reduce(
    (totals, transaction) => ({
      subtotal: totals.subtotal + transaction.subtotal,
      discounts: totals.discounts + (transaction.discount?.computedAmount ?? 0),
      adjustments:
        totals.adjustments +
        transaction.adjustments.reduce((sum, item) => sum + item.computedAmount, 0),
      total: totals.total + transaction.totalAmount,
      cash: totals.cash + (transaction.paymentMethod === "cash" ? transaction.totalAmount : 0),
      card: totals.card + (transaction.paymentMethod === "card" ? transaction.totalAmount : 0),
    }),
    { subtotal: 0, discounts: 0, adjustments: 0, total: 0, cash: 0, card: 0 },
  );

  function exportRows() {
    return filteredTransactions.map((transaction) => {
      const items = transactionItems
        .filter((item) => item.transactionId === transaction.id)
        .map((item) => {
          const addOns =
            item.selectedAddOns.length > 0
              ? ` + ${item.selectedAddOns.map((addOn) => addOn.name).join(" + ")}`
              : "";
          return `${item.quantity}x ${item.itemNameSnapshot}${addOns}`;
        })
        .join(", ");
      const adjustments = transaction.adjustments
        .map((adjustment) => `${adjustment.label}: ${formatPeso(adjustment.computedAmount)}`)
        .join(", ");

      return {
        "Transaction Number": transaction.transactionNumber,
        "Date/Time": formatDateTime(transaction.createdAt),
        "Payment Method": transaction.paymentMethod,
        "Order Type": transaction.orderType === "dine-in" ? "Dine In" : "Take Out",
        "Reference ID": transaction.referenceId,
        Subtotal: toPesoNumber(transaction.subtotal),
        Discount: transaction.discount
          ? `${transaction.discount.label}: -${formatPeso(transaction.discount.computedAmount)}`
          : "",
        "Discount Total": toPesoNumber(transaction.discount?.computedAmount ?? 0),
        Adjustments: adjustments,
        "Adjustments Total": toPesoNumber(
          transaction.adjustments.reduce((sum, adjustment) => sum + adjustment.computedAmount, 0),
        ),
        Total: toPesoNumber(transaction.totalAmount),
        "VAT Enabled": transaction.vatEnabled ? "Yes" : "No",
        "VAT Percentage": transaction.vatPercentage ?? 0,
        "VAT Inclusive": transaction.vatInclusive ? "Yes" : "No",
        "VATable Sales": toPesoNumber(transaction.vatableSales ?? 0),
        "VAT Amount": toPesoNumber(transaction.vatAmount ?? 0),
        "Payment Amount": toPesoNumber(transaction.paymentAmount),
        Change: toPesoNumber(transaction.changeAmount),
        Items: items,
      };
    });
  }

  function exportCsv() {
    const rows = exportRows();
    const headers = Object.keys(
      rows[0] ?? {
        "Transaction Number": "",
        "Date/Time": "",
        "Payment Method": "",
        "Order Type": "",
        "Reference ID": "",
        Subtotal: "",
        Discount: "",
        "Discount Total": "",
        Adjustments: "",
        "Adjustments Total": "",
        Total: "",
        "VAT Enabled": "",
        "VAT Percentage": "",
        "VAT Inclusive": "",
        "VATable Sales": "",
        "VAT Amount": "",
        "Payment Amount": "",
        Change: "",
        Items: "",
      },
    );
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] ?? "");
            return `"${value.replaceAll('"', '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    downloadFile(csv, `brightly-report-${reportStartDate}-to-${reportEndDate}.csv`, "text/csv");
  }

  function exportXlsx() {
    const sheet = XLSX.utils.json_to_sheet(exportRows());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Transactions");
    XLSX.writeFile(workbook, `brightly-report-${reportStartDate}-to-${reportEndDate}.xlsx`);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto_auto]">
        <label className="text-sm font-semibold text-stone-700">
          Start date
          <input
            type="date"
            value={reportStartDate}
            onChange={(event) => setReportRange(event.target.value, reportEndDate)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
          />
        </label>
        <label className="text-sm font-semibold text-stone-700">
          End date
          <input
            type="date"
            value={reportEndDate}
            onChange={(event) => setReportRange(reportStartDate, event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
          />
        </label>
        <button
          type="button"
          disabled={filteredTransactions.length === 0}
          onClick={exportCsv}
          className="mt-auto min-h-12 rounded-lg border border-stone-300 px-4 font-bold disabled:cursor-not-allowed disabled:text-stone-300"
        >
          CSV
        </button>
        <button
          type="button"
          disabled={filteredTransactions.length === 0}
          onClick={exportXlsx}
          className="mt-auto min-h-12 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          XLSX
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Metric label="Transactions" value={String(filteredTransactions.length)} />
        <Metric label="Subtotal" value={formatPeso(reportTotals.subtotal)} />
        <Metric label="Discounts" value={`-${formatPeso(reportTotals.discounts)}`} />
        <Metric label="Charges" value={formatPeso(reportTotals.adjustments)} />
        <Metric label="Cash" value={formatPeso(reportTotals.cash)} />
        <Metric label="Card" value={formatPeso(reportTotals.card)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <CalendarDays size={20} className="text-amber-800" />
          <h2 className="font-bold">Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Charges</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-stone-500">
                    No transactions in this date range
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    items={transactionItems.filter((item) => item.transactionId === transaction.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function TransactionRow({
  items,
  transaction,
}: {
  items: Array<{ itemNameSnapshot: string; quantity: number; selectedAddOns: Array<{ name: string }> }>;
  transaction: Transaction;
}) {
  const adjustmentTotal = transaction.adjustments.reduce(
    (sum, adjustment) => sum + adjustment.computedAmount,
    0,
  );

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{transaction.transactionNumber}</span>
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
      </td>
      <td className="px-4 py-3 text-stone-600">{formatDateTime(transaction.createdAt)}</td>
      <td className="px-4 py-3 text-stone-600">
        {items
          .map((item) => {
            const addOns =
              item.selectedAddOns.length > 0
                ? ` + ${item.selectedAddOns.map((addOn) => addOn.name).join(" + ")}`
                : "";
            return `${item.quantity}x ${item.itemNameSnapshot}${addOns}`;
          })
          .join(", ")}
      </td>
      <td className="px-4 py-3 capitalize text-stone-600">{transaction.paymentMethod}</td>
      <td className="px-4 py-3">{formatPeso(transaction.subtotal)}</td>
      <td className="px-4 py-3">
        {transaction.discount ? `-${formatPeso(transaction.discount.computedAmount)}` : formatPeso(0)}
      </td>
      <td className="px-4 py-3">{formatPeso(adjustmentTotal)}</td>
      <td className="px-4 py-3 font-bold">{formatPeso(transaction.totalAmount)}</td>
    </tr>
  );
}
