import type { ReactNode } from "react";

export function ToggleRow({
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
    <label className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-white px-4">
      <span className="flex min-w-0 items-center gap-3 font-bold">
        <span className="shrink-0 text-amber-800">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-6 w-6 shrink-0 accent-amber-700 disabled:opacity-40"
      />
    </label>
  );
}
