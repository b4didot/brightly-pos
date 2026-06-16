import { CalendarDays, Download, FileSpreadsheet, X } from "lucide-react";
import type { ReactNode, WheelEvent } from "react";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { usePosStore } from "../store/usePosStore";
import type { Transaction, TransactionItem } from "../types";
import { formatDateTime, isWithinDateRange } from "../utils/dates";
import { downloadFile } from "../utils/download";
import { formatPeso, formatSignedPeso, toPesoNumber } from "../utils/money";

type ExportFormat = "csv" | "xlsx";
type ReportKind =
  | "transaction-report"
  | "sales-summary"
  | "sales-by-item"
  | "sales-by-category"
  | "sales-by-payment-type"
  | "discounts"
  | "vat";
type ReportRow = Record<string, string | number>;

const reportOptions: Array<{ id: ReportKind; label: string }> = [
  { id: "transaction-report", label: "Transaction Report" },
  { id: "sales-summary", label: "Sales Summary" },
  { id: "sales-by-item", label: "Sales by Item" },
  { id: "sales-by-category", label: "Sales by Category" },
  { id: "sales-by-payment-type", label: "Sales by Payment Type" },
  { id: "discounts", label: "Discounts" },
  { id: "vat", label: "VAT" },
];

export function ReportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportKind>("transaction-report");
  const [toast, setToast] = useState<{ message: string; show: boolean; tone: "success" | "error" }>({
    message: "",
    show: false,
    tone: "success",
  });
  const toastTimerRef = useRef<number | null>(null);
  const transactions = usePosStore((state) => state.transactions);
  const transactionItems = usePosStore((state) => state.transactionItems);
  const reportStartDate = usePosStore((state) => state.reportStartDate);
  const reportEndDate = usePosStore((state) => state.reportEndDate);
  const setReportRange = usePosStore((state) => state.setReportRange);
  const transactionsInRange = useMemo(() => {
    const startDate = reportStartDate <= reportEndDate ? reportStartDate : reportEndDate;
    const endDate = reportStartDate <= reportEndDate ? reportEndDate : reportStartDate;

    return transactions.filter((transaction) =>
      isWithinDateRange(transaction.createdAt, startDate, endDate),
    );
  }, [reportEndDate, reportStartDate, transactions]);
  const filteredTransactions = useMemo(
    () => transactionsInRange.filter((transaction) => !transaction.isVoided),
    [transactionsInRange],
  );
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
      vat: totals.vat + (transaction.vatAmount ?? 0),
    }),
    { subtotal: 0, discounts: 0, adjustments: 0, total: 0, cash: 0, card: 0, vat: 0 },
  );
  const netSales = reportTotals.total - reportTotals.discounts - reportTotals.adjustments - reportTotals.vat;

  const selectedReportLabel = reportOptions.find((report) => report.id === selectedReport)?.label ?? "Report";
  const dateRangeLabel = `${formatDateLabel(reportStartDate)} - ${formatDateLabel(reportEndDate)}`;

  function showToast(message: string, tone: "success" | "error" = "success") {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ message, show: true, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ message: "", show: false, tone: "success" });
    }, 2400);
  }

  function transactionItemsFor(transactionId: string) {
    return transactionItems.filter((item) => item.transactionId === transactionId);
  }

  function transactionItemSummary(transactionId: string) {
    return transactionItemsFor(transactionId)
      .map((item) => {
        const addOns =
          item.selectedAddOns.length > 0
            ? ` + ${item.selectedAddOns.map((addOn) => addOn.name).join(" + ")}`
            : "";
        return `${item.quantity}x ${item.itemNameSnapshot}${addOns}`;
      })
      .join(", ");
  }

  function buildReportRows(reportKind: ReportKind): ReportRow[] {
    if (reportKind === "transaction-report") {
      return transactionsInRange.map((transaction) => ({
        "Transaction Number": transaction.transactionNumber,
        "Date/Time": formatDateTime(transaction.createdAt),
        "Transaction Status": transaction.isVoided ? "Voided" : "Completed",
        "Void Reason": transaction.voidReason ?? "",
        "Payment Method": transaction.paymentMethod,
        "Order Type": transaction.orderType === "dine-in" ? "Dine In" : "Take Out",
        "Reference ID": transaction.referenceId,
        Subtotal: toPesoNumber(transaction.subtotal),
        Discount: transaction.discount
          ? `${transaction.discount.label}: -${formatPeso(transaction.discount.computedAmount)}`
          : "",
        "Discount Total": toPesoNumber(transaction.discount?.computedAmount ?? 0),
        Adjustments: transaction.adjustments
          .map((adjustment) => `${adjustment.label}: ${formatSignedPeso(adjustment.computedAmount)}`)
          .join(", "),
        "Adjustments Total": toPesoNumber(
          transaction.adjustments.reduce((sum, adjustment) => sum + adjustment.computedAmount, 0),
        ),
        "VAT Amount": toPesoNumber(transaction.vatAmount),
        Total: toPesoNumber(transaction.totalAmount),
        "Payment Amount": toPesoNumber(transaction.paymentAmount),
        Change: toPesoNumber(transaction.changeAmount),
        Items: transactionItemSummary(transaction.id),
      }));
    }

    if (reportKind === "sales-summary") {
      return [
        {
          "Start Date": reportStartDate,
          "End Date": reportEndDate,
          Transactions: filteredTransactions.length,
          Subtotal: toPesoNumber(reportTotals.subtotal),
          Discounts: toPesoNumber(reportTotals.discounts),
          Adjustments: toPesoNumber(reportTotals.adjustments),
          "Net Sales": toPesoNumber(netSales),
          Cash: toPesoNumber(reportTotals.cash),
          Card: toPesoNumber(reportTotals.card),
          VAT: toPesoNumber(reportTotals.vat),
        },
      ];
    }

    if (reportKind === "sales-by-item") {
      const rows = new Map<string, { quantity: number; total: number }>();
      filteredTransactions.forEach((transaction) => {
        transactionItemsFor(transaction.id).forEach((item) => {
          const key = item.itemNameSnapshot;
          const current = rows.get(key) ?? { quantity: 0, total: 0 };
          rows.set(key, {
            quantity: current.quantity + item.quantity,
            total: current.total + item.lineTotal,
          });
        });
      });

      return [...rows.entries()].map(([itemName, row]) => ({
        Item: itemName,
        Quantity: row.quantity,
        Total: toPesoNumber(row.total),
      }));
    }

    if (reportKind === "sales-by-category") {
      const rows = new Map<string, { quantity: number; total: number }>();
      filteredTransactions.forEach((transaction) => {
        transactionItemsFor(transaction.id).forEach((item) => {
          const key = item.categoryNameSnapshot;
          const current = rows.get(key) ?? { quantity: 0, total: 0 };
          rows.set(key, {
            quantity: current.quantity + item.quantity,
            total: current.total + item.lineTotal,
          });
        });
      });

      return [...rows.entries()].map(([category, row]) => ({
        Category: category,
        Quantity: row.quantity,
        Total: toPesoNumber(row.total),
      }));
    }

    if (reportKind === "sales-by-payment-type") {
      return [
        { "Payment Type": "Cash", Transactions: filteredTransactions.filter((txn) => txn.paymentMethod === "cash").length, Total: toPesoNumber(reportTotals.cash) },
        { "Payment Type": "Card", Transactions: filteredTransactions.filter((txn) => txn.paymentMethod === "card").length, Total: toPesoNumber(reportTotals.card) },
      ];
    }

    if (reportKind === "discounts") {
      return filteredTransactions.map((transaction) => ({
        "Transaction Number": transaction.transactionNumber,
        "Date/Time": formatDateTime(transaction.createdAt),
        Discount: transaction.discount?.label ?? "",
        "Discount Total": toPesoNumber(transaction.discount?.computedAmount ?? 0),
        Total: toPesoNumber(transaction.totalAmount),
      }));
    }

    return filteredTransactions.map((transaction) => ({
      "Transaction Number": transaction.transactionNumber,
      "Date/Time": formatDateTime(transaction.createdAt),
      "VAT Enabled": transaction.vatEnabled ? "Yes" : "No",
      "VAT Percentage": transaction.vatPercentage ?? 0,
      "VAT Inclusive": transaction.vatInclusive ? "Yes" : "No",
      "VATable Sales": toPesoNumber(transaction.vatableSales ?? 0),
      "VAT Amount": toPesoNumber(transaction.vatAmount ?? 0),
      Total: toPesoNumber(transaction.totalAmount),
    }));
  }

  function fallbackHeaders(reportKind: ReportKind) {
    if (reportKind === "transaction-report") {
      return {
        "Transaction Number": "",
        "Date/Time": "",
        "Transaction Status": "",
        "Void Reason": "",
        "Payment Method": "",
        "Order Type": "",
        "Reference ID": "",
        Subtotal: "",
        Discount: "",
        "Discount Total": "",
        Adjustments: "",
        "Adjustments Total": "",
        "VAT Amount": "",
        Total: "",
        "Payment Amount": "",
        Change: "",
        Items: "",
      };
    }

    if (reportKind === "sales-summary") {
      return {
        "Start Date": "",
        "End Date": "",
        Transactions: "",
        Subtotal: "",
        Discounts: "",
        Adjustments: "",
        "Net Sales": "",
        Cash: "",
        Card: "",
        VAT: "",
      };
    }

    if (reportKind === "sales-by-item") {
      return { Item: "", Quantity: "", Total: "" };
    }

    if (reportKind === "sales-by-category") {
      return { Category: "", Quantity: "", Total: "" };
    }

    if (reportKind === "sales-by-payment-type") {
      return { "Payment Type": "", Transactions: "", Total: "" };
    }

    if (reportKind === "discounts") {
      return { "Transaction Number": "", "Date/Time": "", Discount: "", "Discount Total": "", Total: "" };
    }

    return {
      "Transaction Number": "",
      "Date/Time": "",
      "VAT Enabled": "",
      "VAT Percentage": "",
      "VAT Inclusive": "",
      "VATable Sales": "",
      "VAT Amount": "",
      Total: "",
    };
  }

  async function exportCsv(reportKind: ReportKind) {
    const rows = buildReportRows(reportKind);
    const headers = Object.keys(rows[0] ?? fallbackHeaders(reportKind));
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

    await exportReport({
      data: csv,
      filename: reportFilename(reportKind, "csv"),
      mimeType: "text/csv",
    });
  }

  async function exportXlsx(reportKind: ReportKind) {
    const rows = buildReportRows(reportKind);
    const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [fallbackHeaders(reportKind)]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, selectedReportLabel.slice(0, 31));
    await exportReport({
      data: XLSX.write(workbook, { bookType: "xlsx", type: "base64" }),
      filename: reportFilename(reportKind, "xlsx"),
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      encoding: "base64",
    });
  }

  async function exportReport(input: Parameters<typeof downloadFile>[0]) {
    try {
      setIsExporting(true);
      await downloadFile(input);
      showToast(`Saved ${input.filename}`);
    } catch (error) {
      console.error(error);
      showToast("Could not export the report. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  }

  function reportFilename(reportKind: ReportKind, format: ExportFormat) {
    return `brightly-${reportKind}-${reportStartDate}-to-${reportEndDate}.${format}`;
  }

  function openDateModal() {
    setDraftStartDate(reportStartDate);
    setDraftEndDate(reportEndDate);
    setIsDateModalOpen(true);
  }

  function applyDateRange() {
    setReportRange(draftStartDate, draftEndDate);
    setIsDateModalOpen(false);
  }

  async function generateReport(format: ExportFormat) {
    if (format === "csv") {
      await exportCsv(selectedReport);
    } else {
      await exportXlsx(selectedReport);
    }
    setIsReportModalOpen(false);
  }

  function scrollTransactionTable(event: WheelEvent<HTMLDivElement>) {
    const target = event.currentTarget;

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || target.scrollWidth <= target.clientWidth) {
      return;
    }

    const nextScrollLeft = target.scrollLeft + event.deltaY;
    const maxScrollLeft = target.scrollWidth - target.clientWidth;
    const canScrollLeft = event.deltaY < 0 && target.scrollLeft > 0;
    const canScrollRight = event.deltaY > 0 && target.scrollLeft < maxScrollLeft;

    if (canScrollLeft || canScrollRight) {
      event.preventDefault();
      target.scrollLeft = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-4">
      <div className="relative mb-4 flex h-16 items-center justify-center rounded-lg border border-stone-200 bg-white p-2 shadow-sm">
        <div className="flex flex-nowrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={openDateModal}
            className="inline-flex h-11 w-48 shrink-0 items-center justify-center gap-2 rounded-lg border border-stone-200 px-3 text-center text-sm font-semibold text-stone-800 sm:w-56 sm:text-base"
          >
            <CalendarDays size={18} className="shrink-0 text-stone-600" />
            <span className="whitespace-nowrap">{dateRangeLabel}</span>
          </button>
          <button
            type="button"
            disabled={transactionsInRange.length === 0 || isExporting}
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex h-11 w-28 shrink-0 items-center justify-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-32 sm:text-base"
          >
            <Download size={18} />
            Reports
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <HeroMetric label="Total Transactions" value={String(filteredTransactions.length)} />
        <HeroMetric label="Net Sales" value={formatPeso(netSales)} />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Cash" value={formatPeso(reportTotals.cash)} />
        <Metric label="Card" value={formatPeso(reportTotals.card)} />
        <Metric label="Discounts" value={`-${formatPeso(reportTotals.discounts)}`} />
        <Metric label="VAT" value={formatPeso(reportTotals.vat)} />
        <Metric label="Adjustments" value={formatSignedPeso(reportTotals.adjustments)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
          <CalendarDays size={20} className="text-stone-600" />
          <h2 className="font-bold">Transactions</h2>
        </div>
        <div className="report-table-scroll overflow-x-auto pb-2" onWheel={scrollTransactionTable}>
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Adjustments</th>
                <th className="px-4 py-3">VAT</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-stone-500">
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

      {isDateModalOpen ? (
        <Modal title="Date Range" onClose={() => setIsDateModalOpen(false)}>
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-stone-700">
              Start date
              <input
                type="date"
                value={draftStartDate}
                onChange={(event) => setDraftStartDate(event.target.value)}
                className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 px-3 outline-none focus:border-amber-700"
              />
            </label>
            <label className="text-sm font-semibold text-stone-700">
              End date
              <input
                type="date"
                value={draftEndDate}
                onChange={(event) => setDraftEndDate(event.target.value)}
                className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 px-3 outline-none focus:border-amber-700"
              />
            </label>
            <button
              type="button"
              onClick={applyDateRange}
              className="min-h-12 rounded-lg bg-stone-950 px-4 font-bold text-white"
            >
              Apply
            </button>
          </div>
        </Modal>
      ) : null}

      {isReportModalOpen ? (
        <Modal title="Generate Report" onClose={() => setIsReportModalOpen(false)}>
          <div className="grid gap-3">
            <div className="grid gap-2">
              {reportOptions.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReport(report.id)}
                  className={`flex min-h-11 items-center justify-between rounded-lg border px-3 text-left font-semibold ${
                    selectedReport === report.id
                      ? "border-amber-700 bg-amber-50 text-amber-900"
                      : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  {report.label}
                  {selectedReport === report.id ? <FileSpreadsheet size={18} /> : null}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => void generateReport("csv")}
                className="min-h-12 rounded-lg border border-stone-300 px-4 font-bold disabled:cursor-not-allowed disabled:text-stone-300"
              >
                CSV
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => void generateReport("xlsx")}
                className="min-h-12 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                XLSX
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {toast.show ? (
        <div
          className={`fixed bottom-20 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-lg px-4 py-2 text-sm font-bold text-white shadow-lg md:bottom-4 ${
            toast.tone === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}

function formatDateLabel(dateInput: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(new Date(`${dateInput}T00:00:00`));
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
      <p className="mt-3 text-4xl font-black text-stone-950">{value}</p>
    </div>
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

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TransactionRow({
  items,
  transaction,
}: {
  items: Pick<TransactionItem, "itemNameSnapshot" | "quantity" | "selectedAddOns">[];
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
      <td className="px-4 py-3">{formatSignedPeso(adjustmentTotal)}</td>
      <td className="px-4 py-3">{formatPeso(transaction.vatAmount)}</td>
      <td className="px-4 py-3 font-bold">{formatPeso(transaction.totalAmount)}</td>
    </tr>
  );
}
