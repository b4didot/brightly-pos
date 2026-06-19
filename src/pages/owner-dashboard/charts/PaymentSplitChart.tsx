import { formatPeso } from "../../../utils/money";
import { dashboardTheme } from "../theme";

export function PaymentSplitChart({ card, cash }: { card: number; cash: number }) {
  const total = Math.max(cash + card, 1);
  const cashPercent = Math.round((cash / total) * 100);

  return (
    <div className="grid gap-4">
      <div
        className="mx-auto grid size-48 place-items-center rounded-full"
        style={{ background: `conic-gradient(${dashboardTheme.primary} 0 ${cashPercent}%, ${dashboardTheme.secondary} ${cashPercent}% 100%)` }}
      >
        <div className="grid size-28 place-items-center rounded-full bg-white text-center shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Cash</p>
            <p className="text-xl font-black">{cashPercent}%</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <SplitRow color={dashboardTheme.primary} label="Cash" trackColor={dashboardTheme.primarySoft} value={cash} total={total} />
        <SplitRow color={dashboardTheme.secondary} label="Card" trackColor={dashboardTheme.secondarySoft} value={card} total={total} />
      </div>
    </div>
  );
}

function SplitRow({
  color,
  label,
  total,
  trackColor,
  value,
}: {
  color: string;
  label: string;
  total: number;
  trackColor: string;
  value: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span>{formatPeso(value)} / {percent}%</span>
      </div>
      <div className="h-3 rounded-full" style={{ backgroundColor: trackColor }}>
        <div className="h-3 rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
