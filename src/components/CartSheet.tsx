import { ChevronsUp, Maximize2, Minus, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import type { CartLine } from "../types";
import { formatPeso } from "../utils/money";

export type CartSheetState = "minimized" | "half" | "full";

type CartSheetProps = {
  children: ReactNode;
  sheetState: CartSheetState;
  items: CartLine[];
  onToggle: () => void;
  title?: ReactNode;
  total: number;
};

export function CartSheet({ children, sheetState, items, onToggle, title, total }: CartSheetProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemLabel = itemCount === 1 ? "1 item" : `${itemCount} items`;
  const isMinimized = sheetState === "minimized";
  const stateIcon =
    sheetState === "minimized" ? <Minus size={16} /> : sheetState === "half" ? <ChevronsUp size={16} /> : <Maximize2 size={16} />;

  return (
    <aside className="cart-sheet fixed inset-x-0 bottom-0 z-40 md:static md:z-auto md:self-start lg:sticky lg:top-24">
      <div className="cart-sheet-shell overflow-hidden rounded-t-xl border border-stone-200 bg-white shadow-2xl md:rounded-lg md:shadow-sm">
        {title ? <div className="hidden border-b border-stone-200 px-3 py-2 md:block">{title}</div> : null}

        <div className={`cart-sheet-content cart-sheet-content-${sheetState} flex flex-col overflow-hidden md:block md:h-auto`}>
          {children}
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-label={`Cart is ${sheetState}. Show next cart size.`}
          aria-expanded={!isMinimized}
          className="cart-sheet-toggle flex min-h-14 w-full items-center justify-between gap-3 bg-stone-950 px-4 py-3 text-left text-white md:hidden"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ShoppingCart size={18} className="shrink-0" />
            <span className="truncate text-sm font-bold">{itemLabel}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white/80">{stateIcon}</span>
            <span className="text-lg font-bold">{formatPeso(total)}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
