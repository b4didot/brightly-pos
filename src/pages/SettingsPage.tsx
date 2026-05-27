import { Banknote, Boxes, CreditCard, Percent, ReceiptText, ShoppingCart, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { categoryColors, categoryFallback } from "../constants/catalog";
import { SectionHeader } from "../components/SectionHeader";
import { usePosStore } from "../store/usePosStore";
import type { Adjustment, Category, Item } from "../types";
import { formatPeso, parsePesoInput } from "../utils/money";

export function SettingsPage() {
  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-4 py-4 xl:grid-cols-[1fr_1fr]">
      <CatalogSettings />
      <OperationalSettings />
    </section>
  );
}

function CatalogSettings() {
  const categories = usePosStore((state) => state.categories);
  const items = usePosStore((state) => state.items);
  const saveCategory = usePosStore((state) => state.saveCategory);
  const deleteCategory = usePosStore((state) => state.deleteCategory);
  const saveItem = usePosStore((state) => state.saveItem);
  const deleteItem = usePosStore((state) => state.deleteItem);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(categoryColors[0]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState<string>("uncategorized");

  function startCategoryEdit(category: Category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.defaultColor);
  }

  function resetCategoryForm() {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryColor(categoryColors[0]);
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryName.trim()) {
      return;
    }

    await saveCategory({
      id: editingCategory?.id,
      name: categoryName,
      defaultColor: categoryColor,
    });
    resetCategoryForm();
  }

  function startItemEdit(item: Item) {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(String(item.price / 100));
    setItemCategoryId(item.categoryId ?? "uncategorized");
  }

  function resetItemForm() {
    setEditingItem(null);
    setItemName("");
    setItemPrice("");
    setItemCategoryId("uncategorized");
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!itemName.trim()) {
      return;
    }

    await saveItem({
      id: editingItem?.id,
      name: itemName,
      price: parsePesoInput(itemPrice),
      categoryId: itemCategoryId === "uncategorized" ? null : itemCategoryId,
    });
    resetItemForm();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <SectionHeader icon={<Boxes size={22} />} label="Categories" />
        <form onSubmit={(event) => void submitCategory(event)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="Category name"
          />
          <div className="flex items-center gap-2">
            {categoryColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                onClick={() => setCategoryColor(color)}
                className={`h-10 w-10 rounded-full border-2 ${
                  categoryColor === color ? "border-stone-950" : "border-white"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white" type="submit">
            {editingCategory ? "Save Category" : "Add Category"}
          </button>
          {editingCategory && (
            <button
              type="button"
              onClick={resetCategoryForm}
              className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold"
            >
              Cancel
            </button>
          )}
        </form>
        <div className="mt-4 grid gap-2">
          {categories.map((category) => (
            <SettingRow
              key={category.id}
              title={category.name}
              detail="Editable category"
              swatch={category.defaultColor}
              onEdit={() => startCategoryEdit(category)}
              onDelete={() => void deleteCategory(category.id)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <SectionHeader icon={<ShoppingCart size={22} />} label="Items" />
        <form onSubmit={(event) => void submitItem(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="Item name"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={itemPrice}
            onChange={(event) => setItemPrice(event.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="Price"
          />
          <select
            value={itemCategoryId}
            onChange={(event) => setItemCategoryId(event.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
          >
            <option value="uncategorized">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white" type="submit">
              {editingItem ? "Save Item" : "Add Item"}
            </button>
            {editingItem && (
              <button
                type="button"
                onClick={resetItemForm}
                className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        <div className="mt-4 grid gap-2">
          {items.map((item) => {
            const category = categories.find((entry) => entry.id === item.categoryId);

            return (
              <SettingRow
                key={item.id}
                title={item.name}
                detail={`${category?.name ?? "Uncategorized"} · ${formatPeso(item.price)}`}
                swatch={category?.defaultColor ?? categoryFallback}
                onEdit={() => startItemEdit(item)}
                onDelete={() => void deleteItem(item.id)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function OperationalSettings() {
  const adjustments = usePosStore((state) => state.adjustments);
  const settings = usePosStore((state) => state.settings);
  const saveAdjustment = usePosStore((state) => state.saveAdjustment);
  const deleteAdjustment = usePosStore((state) => state.deleteAdjustment);
  const setPaymentMethodEnabled = usePosStore((state) => state.setPaymentMethodEnabled);
  const updateVatSettings = usePosStore((state) => state.updateVatSettings);
  const [editingAdjustment, setEditingAdjustment] = useState<Adjustment | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"percentage" | "flat">("percentage");
  const [value, setValue] = useState("");
  const [enabled, setEnabled] = useState(true);

  function startAdjustmentEdit(adjustment: Adjustment) {
    setEditingAdjustment(adjustment);
    setLabel(adjustment.label);
    setType(adjustment.type);
    setValue(adjustment.type === "flat" ? String(adjustment.value / 100) : String(adjustment.value));
    setEnabled(adjustment.enabled);
  }

  function resetAdjustmentForm() {
    setEditingAdjustment(null);
    setLabel("");
    setType("percentage");
    setValue("");
    setEnabled(true);
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!label.trim()) {
      return;
    }

    await saveAdjustment({
      id: editingAdjustment?.id,
      label,
      type,
      value: type === "flat" ? parsePesoInput(value) : Math.max(0, Number(value) || 0),
      enabled,
    });
    resetAdjustmentForm();
  }

  function updateVatSetting(settingsPatch: Partial<Pick<typeof settings, "vatEnabled" | "vatPercentage" | "vatInclusive">>) {
    void updateVatSettings({
      vatEnabled: settingsPatch.vatEnabled ?? settings.vatEnabled,
      vatPercentage: settingsPatch.vatPercentage ?? settings.vatPercentage,
      vatInclusive: settingsPatch.vatInclusive ?? settings.vatInclusive,
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <SectionHeader icon={<ReceiptText size={22} />} label="Adjustments" />
        <form onSubmit={(event) => void submitAdjustment(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder="Tax, service charge, delivery fee"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "percentage" | "flat")}
            className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
          >
            <option value="percentage">Percentage</option>
            <option value="flat">Flat amount</option>
          </select>
          <input
            type="number"
            min="0"
            step={type === "flat" ? "0.01" : "0.1"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            placeholder={type === "flat" ? "Amount" : "Percent"}
          />
          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-stone-200 px-3 font-semibold">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-5 w-5 accent-amber-700"
            />
            Auto-apply
          </label>
          <button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white" type="submit">
            {editingAdjustment ? "Save Adjustment" : "Add Adjustment"}
          </button>
          {editingAdjustment && (
            <button
              type="button"
              onClick={resetAdjustmentForm}
              className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold"
            >
              Cancel
            </button>
          )}
        </form>
        <div className="mt-4 grid gap-2">
          {adjustments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
              No automatic charges configured
            </p>
          ) : (
            adjustments.map((adjustment) => (
              <SettingRow
                key={adjustment.id}
                title={adjustment.label}
                detail={`${adjustment.enabled ? "Auto-applied" : "Disabled"} · ${
                  adjustment.type === "flat" ? formatPeso(adjustment.value) : `${adjustment.value}%`
                }`}
                onEdit={() => startAdjustmentEdit(adjustment)}
                onDelete={() => void deleteAdjustment(adjustment.id)}
              />
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <SectionHeader icon={<Percent size={22} />} label="VAT Pricing" />
        <div className="mt-4 grid gap-3">
          <ToggleRow
            checked={settings.vatEnabled}
            disabled={false}
            icon={<Percent size={20} />}
            label="VAT Enabled"
            onChange={(checked) => updateVatSetting({ vatEnabled: checked })}
          />
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            VAT Percentage
            <input
              type="number"
              min="0"
              step="0.1"
              value={settings.vatPercentage}
              onChange={(event) =>
                updateVatSetting({ vatPercentage: Math.max(0, Number(event.target.value) || 0) })
              }
              className="rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
            />
          </label>
          <ToggleRow
            checked={settings.vatInclusive}
            disabled={false}
            icon={<ReceiptText size={20} />}
            label="VAT Inclusive"
            onChange={(checked) => updateVatSetting({ vatInclusive: checked })}
          />
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <SectionHeader icon={<CreditCard size={22} />} label="Payment Options" />
        <div className="mt-4 grid gap-3">
          <ToggleRow
            checked={settings.cashEnabled}
            disabled={settings.cashEnabled && !settings.cardEnabled}
            icon={<Banknote size={20} />}
            label="Cash"
            onChange={(checked) => void setPaymentMethodEnabled("cash", checked)}
          />
          <ToggleRow
            checked={settings.cardEnabled}
            disabled={settings.cardEnabled && !settings.cashEnabled}
            icon={<CreditCard size={20} />}
            label="Card"
            onChange={(checked) => void setPaymentMethodEnabled("card", checked)}
          />
        </div>
      </section>
    </div>
  );
}

function SettingRow({
  detail,
  onDelete,
  onEdit,
  swatch,
  title,
}: {
  detail: string;
  onDelete: () => void;
  onEdit: () => void;
  swatch?: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {swatch && (
          <span
            className="h-9 w-9 shrink-0 rounded-lg border border-black/10"
            style={{ backgroundColor: swatch }}
          />
        )}
        <div className="min-w-0">
          <p className="truncate font-bold">{title}</p>
          <p className="truncate text-sm text-stone-500">{detail}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="grid h-10 w-10 place-items-center rounded-lg border border-red-100 text-red-600"
          aria-label={`Delete ${title}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  disabled,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-stone-50 px-4">
      <span className="flex items-center gap-3 font-bold">
        <span className="text-amber-800">{icon}</span>
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-6 w-6 accent-amber-700 disabled:opacity-40"
      />
    </label>
  );
}
