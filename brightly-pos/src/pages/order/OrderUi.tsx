import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { formatPeso } from "../../utils/money";

export function IconButton({
  children,
  disabled = false,
  label,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-full transition ${
        tone === "danger" ? "text-red-600 hover:bg-red-50" : "text-stone-700 hover:bg-white"
      } disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}

export function ModalFrame({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/45 p-3 sm:p-4">
      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl sm:max-h-[calc(100vh-2rem)]">
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

export function ModalAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
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

export function CompleteNotice({ notice, total }: { notice: string; total: number }) {
  return (
    <div className="rounded-lg bg-emerald-50 px-4 py-5 text-center">
      <Check className="mx-auto text-emerald-700" size={28} />
      <p className="mt-2 font-bold text-emerald-900">{notice || "Payment completed."}</p>
      <p className="mt-1 text-sm font-semibold text-emerald-700">Total Amount: {formatPeso(total)}</p>
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

export function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

export function VatBreakdownLines({
  vatAmount,
  vatEnabled,
  vatableSales,
}: {
  vatAmount: number;
  vatEnabled: boolean;
  vatableSales: number;
}) {
  if (!vatEnabled) {
    return null;
  }

  return (
    <>
      <SummaryLine label="VATable Sales" value={formatPeso(vatableSales)} />
      <SummaryLine label="VAT Amount" value={formatPeso(vatAmount)} />
    </>
  );
}
