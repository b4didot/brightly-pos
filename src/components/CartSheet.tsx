import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import type { CartLine } from "../types";
import { formatPeso } from "../utils/money";

type CartSheetProps = {
  children: ReactNode;
  isExpanded: boolean;
  items: CartLine[];
  onToggle: () => void;
  title?: ReactNode;
  total: number;
};

export function CartSheet({ children, isExpanded, items, onToggle, title, total }: CartSheetProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 md:static md:z-auto md:self-start lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-t-xl border border-stone-200 bg-white shadow-2xl md:rounded-lg md:shadow-sm">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="flex min-h-14 w-full items-center justify-between gap-3 bg-stone-950 px-4 py-3 text-left text-white md:hidden"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ShoppingCart size={18} className="shrink-0" />
            <span className="truncate text-sm font-bold">{itemLabel}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-lg font-bold">{formatPeso(total)}</span>
            {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </span>
        </button>

        {title ? <div className="hidden border-b border-stone-200 px-3 py-2 md:block">{title}</div> : null}

        <div className={`${isExpanded ? "flex h-[72vh]" : "hidden"} flex-col overflow-hidden md:block md:h-auto`}>
          {children}
        </div>
      </div>
    </aside>
  );
}
