import { categoryFallback } from "../../constants/catalog";
import { usePosStore } from "../../store/usePosStore";
import type { Item } from "../../types";
import { formatPeso } from "../../utils/money";

function CategoryTab({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-bold transition ${
        active ? "border-stone-950 text-stone-950 shadow-sm" : "border-transparent text-stone-700"
      }`}
      style={{ backgroundColor: color ?? categoryFallback }}
    >
      {label}
    </button>
  );
}

export function MenuGrid({
  animatingItemId,
  onAddToCart,
}: {
  animatingItemId: string | null;
  onAddToCart: (item: Item) => void;
}) {
  const categories = usePosStore((state) => state.categories);
  const items = usePosStore((state) => state.items);
  const selectedCategoryId = usePosStore((state) => state.selectedCategoryId);
  const setSelectedCategoryId = usePosStore((state) => state.setSelectedCategoryId);
  const availableItems = items.filter((item) => !item.isOutOfStock);
  const hasUncategorized = availableItems.some((item) => !item.categoryId);
  const filteredItems = availableItems.filter((item) => {
    if (selectedCategoryId === "all") {
      return true;
    }

    if (selectedCategoryId === "uncategorized") {
      return !item.categoryId;
    }

    return item.categoryId === selectedCategoryId;
  });

  return (
    <div className="min-w-0">
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <CategoryTab active={selectedCategoryId === "all"} label="All" onClick={() => setSelectedCategoryId("all")} />
        {categories.map((category) => (
          <CategoryTab
            key={category.id}
            active={selectedCategoryId === category.id}
            label={category.name}
            color={category.defaultColor}
            onClick={() => setSelectedCategoryId(category.id)}
          />
        ))}
        {hasUncategorized && (
          <CategoryTab
            active={selectedCategoryId === "uncategorized"}
            label="Uncategorized"
            onClick={() => setSelectedCategoryId("uncategorized")}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {filteredItems.map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAddToCart(item)}
              className={`relative min-h-36 rounded-lg border border-white/80 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
                animatingItemId === item.id ? "animate-item-added" : ""
              }`}
              style={{ backgroundColor: category?.defaultColor ?? categoryFallback }}
            >
              {animatingItemId === item.id && (
                <span className="pointer-events-none absolute right-3 top-3 animate-float-added rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white shadow-sm">
                  +1
                </span>
              )}
              <span className="absolute inset-3 grid place-items-center">
                <span>
                  <span className="block text-lg font-bold leading-snug text-stone-950">{item.name}</span>
                  <span className="mt-2 block text-base font-semibold text-stone-700">{formatPeso(item.price)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
