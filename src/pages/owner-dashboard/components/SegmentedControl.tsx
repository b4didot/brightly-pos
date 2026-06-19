import type { SalesGraphMode } from "../types";

export function SegmentedControl({
  mode,
  onChange,
}: {
  mode: SalesGraphMode;
  onChange: (mode: SalesGraphMode) => void;
}) {
  const options: Array<{ label: string; value: SalesGraphMode }> = [
    { label: "Net", value: "net" },
    { label: "Gross", value: "gross" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="grid grid-cols-3 rounded-lg bg-stone-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-md px-3 text-xs font-black ${
            mode === option.value ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
