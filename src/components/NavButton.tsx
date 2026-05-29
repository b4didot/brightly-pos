import type { ReactNode } from "react";

type NavButtonProps = {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition sm:px-4 ${
        active ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-950"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
