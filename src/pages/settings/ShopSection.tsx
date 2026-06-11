import { useState } from "react";
import { usePosStore } from "../../store/usePosStore";

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function ShopSection() {
  const settings = usePosStore((state) => state.settings);
  const updateShopSettings = usePosStore((state) => state.updateShopSettings);
  const [shopName, setShopName] = useState(settings.shopName);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);

  function saveShopSettings() {
    void updateShopSettings({ shopName, primaryColor, secondaryColor });
  }

  const primaryColorInputValue = hexColorPattern.test(primaryColor) ? primaryColor : settings.primaryColor;
  const secondaryColorInputValue = hexColorPattern.test(secondaryColor) ? secondaryColor : settings.secondaryColor;

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm font-semibold text-stone-700">
        Name of Shop
        <input
          type="text"
          value={shopName}
          onChange={(event) => setShopName(event.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Primary Color
          <span className="grid grid-cols-[3.5rem_1fr] gap-2">
            <input
              type="color"
              value={primaryColorInputValue}
              onChange={(event) => setPrimaryColor(event.target.value)}
              className="h-12 w-full rounded-lg border border-stone-300 bg-white p-1"
              aria-label="Primary Color"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
              className="min-w-0 rounded-lg border border-stone-300 px-3 py-3 font-mono text-sm uppercase outline-none focus:border-amber-700"
            />
          </span>
        </label>

        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Secondary Color
          <span className="grid grid-cols-[3.5rem_1fr] gap-2">
            <input
              type="color"
              value={secondaryColorInputValue}
              onChange={(event) => setSecondaryColor(event.target.value)}
              className="h-12 w-full rounded-lg border border-stone-300 bg-white p-1"
              aria-label="Secondary Color"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(event) => setSecondaryColor(event.target.value)}
              className="min-w-0 rounded-lg border border-stone-300 px-3 py-3 font-mono text-sm uppercase outline-none focus:border-amber-700"
            />
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={saveShopSettings}
        className="min-h-11 rounded-lg px-4 font-bold text-white"
        style={{ backgroundColor: primaryColorInputValue }}
      >
        Save Shop
      </button>
    </div>
  );
}
