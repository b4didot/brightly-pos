import type { ReactNode } from "react";

type SectionHeaderProps = {
  icon: ReactNode;
  label: string;
};

export function SectionHeader({ icon, label }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-800">{icon}</div>
      <h2 className="text-lg font-bold">{label}</h2>
    </div>
  );
}
