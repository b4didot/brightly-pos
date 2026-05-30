import { TogglePill } from "../../components/TogglePill";
import { usePosStore } from "../../store/usePosStore";

export function VatSection() {
  const settings = usePosStore((state) => state.settings);
  const updateVatSettings = usePosStore((state) => state.updateVatSettings);

  function updateVatSetting(settingsPatch: Partial<Pick<typeof settings, "vatEnabled" | "vatPercentage">>) {
    void updateVatSettings({
      vatEnabled: settingsPatch.vatEnabled ?? settings.vatEnabled,
      vatPercentage: settingsPatch.vatPercentage ?? settings.vatPercentage,
    });
  }

  return (
    <div className="grid gap-3">
      <TogglePill enabled={settings.vatEnabled} label="VAT Enabled" onChange={(enabled) => updateVatSetting({ vatEnabled: enabled })} />
      <label className="grid gap-1 text-sm font-semibold text-stone-700">
        VAT Percentage
        <input
          type="number"
          min="0"
          step="0.1"
          value={settings.vatPercentage}
          onChange={(event) => updateVatSetting({ vatPercentage: Math.max(0, Number(event.target.value) || 0) })}
          className="w-full rounded-lg border border-stone-300 px-3 py-3 outline-none focus:border-amber-700"
        />
      </label>
    </div>
  );
}
