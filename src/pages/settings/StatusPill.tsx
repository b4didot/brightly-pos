export function StatusPill({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
        checked
          ? "border-amber-700 bg-amber-50 text-amber-800"
          : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${checked ? "bg-amber-700" : "bg-emerald-600"}`} />
      {label}
    </button>
  );
}
