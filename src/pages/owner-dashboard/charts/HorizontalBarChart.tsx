import { formatPeso } from "../../../utils/money";
import { dashboardTheme } from "../theme";
import type { OverviewBarDatum } from "../types";
import { EmptyText } from "../components/EmptyState";

export function HorizontalBarChart({ rows, tone }: { rows: OverviewBarDatum[]; tone: "primary" | "secondary" }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const barColor = tone === "primary" ? dashboardTheme.primary : dashboardTheme.secondary;
  const trackColor = tone === "primary" ? dashboardTheme.primarySoft : dashboardTheme.secondarySoft;

  if (rows.length === 0) {
    return <EmptyText>No data available yet.</EmptyText>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-bold">{row.label}</span>
            <span className="shrink-0 font-semibold text-stone-600">{row.value > 999 ? formatPeso(row.value) : row.value}</span>
          </div>
          <div className="h-3 rounded-full" style={{ backgroundColor: trackColor }}>
            <div className="h-3 rounded-full" style={{ width: row.value === 0 ? 0 : `${Math.max(4, (row.value / max) * 100)}%`, backgroundColor: barColor }} />
          </div>
        </div>
      ))}
    </div>
  );
}
