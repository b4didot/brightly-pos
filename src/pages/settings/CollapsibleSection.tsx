import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function CollapsibleSection({
  children,
  icon,
  isOpen,
  onToggle,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-stone-50"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2 text-base font-bold text-stone-950">
          <span className="shrink-0 text-amber-800">{icon}</span>
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="border-t border-stone-100 bg-stone-50/70 p-3 sm:p-4">{children}</div>}
    </section>
  );
}
