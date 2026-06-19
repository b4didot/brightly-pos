import type { ReactNode } from "react";

export function DashboardPanel({
  action,
  children,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-stone-600">{icon}</span>
          <h2 className="font-black">{title}</h2>
        </div>
        {action ? <div className="w-fit">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
