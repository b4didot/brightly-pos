type TogglePillProps = {
  disabled?: boolean;
  enabled: boolean;
  label: string;
  onChange: (value: boolean) => void;
};

export function TogglePill({ disabled = false, enabled, label, onChange }: TogglePillProps) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-white px-4">
      <span className="min-w-0 truncate font-bold text-stone-950">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled ? "bg-amber-600" : "bg-stone-300"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
