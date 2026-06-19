import type { ReactNode } from "react";

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  const classes = {
    success: "bg-[#DDF1F1] text-[#2F7474]",
    warning: "bg-[#F5DFBF] text-[#75485E]",
    danger: "bg-red-50 text-red-700",
    muted: "bg-stone-100 text-stone-600",
  };
  return <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold uppercase ${classes[tone]}`}>{children}</span>;
}
