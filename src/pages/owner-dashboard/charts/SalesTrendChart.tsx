import { useState } from "react";
import { formatPeso } from "../../../utils/money";
import { formatChartDayLabel, formatCompactCurrency } from "../analytics";
import { dashboardTheme } from "../theme";
import type { OverviewTrendPoint, SalesGraphMode } from "../types";

export function SalesTrendChart({
  mode,
  points,
}: {
  mode: SalesGraphMode;
  onModeChange?: (mode: SalesGraphMode) => void;
  points: OverviewTrendPoint[];
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const visibleSeries = mode === "all" ? ["gross", "net"] as const : [mode] as const;
  const max = Math.max(...points.flatMap((point) => visibleSeries.map((series) => point[series])), 1);
  const yMax = Math.ceil(max / 1000) * 1000 || max;
  const axisGutter = 76;
  const left = axisGutter;
  const right = axisGutter;
  const top = 16;
  const bottom = 42;
  const width = Math.min(Math.max(620, points.length * 68 + left + right), 1440);
  const height = 300;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const yTicks = [1, 0.75, 0.5, 0.25, 0];
  const labelInterval = points.length <= 14 ? 1 : points.length <= 31 ? 2 : points.length <= 62 ? 4 : 7;
  const seriesStyles = {
    gross: { area: dashboardTheme.primarySoft, dot: dashboardTheme.primary, label: "Gross", line: dashboardTheme.primary },
    net: { area: dashboardTheme.secondarySoft, dot: dashboardTheme.secondary, label: "Net", line: dashboardTheme.secondary },
  };

  function chartPointsFor(series: "gross" | "net") {
    return points.map((point, index) => {
      const x = left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
      const y = top + plotHeight - (point[series] / yMax) * plotHeight;
      return { ...point, x, y, value: point[series] };
    });
  }

  function pathFor(seriesPoints: ReturnType<typeof chartPointsFor>) {
    return seriesPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }

  function renderTooltip(index: number, tone: "hover" | "selected") {
    const point = points[index];
    if (!point) return null;
    const x = left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const selectedValues = visibleSeries.map((series) => `${seriesStyles[series].label}: ${formatPeso(point[series])}`).join(" / ");
    const boxWidth = mode === "all" ? 178 : 124;
    const boxX = Math.min(Math.max(x - boxWidth / 2, left), width - right - boxWidth);

    return (
      <g key={`${tone}-${index}`}>
        <line
          x1={x}
          x2={x}
          y1={top}
          y2={top + plotHeight}
          stroke={tone === "selected" ? dashboardTheme.secondaryDark : dashboardTheme.primary}
          strokeDasharray={tone === "selected" ? "5 5" : "3 5"}
          strokeWidth="1.5"
          opacity={tone === "selected" ? "1" : "0.8"}
        />
        <rect x={boxX} y={top + (tone === "selected" ? 8 : 48)} width={boxWidth} height="34" rx="7" fill="#ffffff" stroke="#E7E1D7" />
        <text x={boxX + boxWidth / 2} y={top + (tone === "selected" ? 30 : 70)} textAnchor="middle" className="fill-stone-800 text-[11px] font-bold">
          {selectedValues}
        </text>
      </g>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-x-auto rounded-lg p-2" style={{ backgroundColor: dashboardTheme.surface }}>
      <div className="h-full" style={{ minWidth: `${width}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sales over time" className="block h-full w-full">
        {yTicks.map((tick) => {
          const y = top + (1 - tick) * plotHeight;
          return (
            <g key={tick}>
              <line x1={left} x2={left + plotWidth} y1={y} y2={y} stroke={dashboardTheme.grid} strokeWidth="1" />
              <text x={left - 10} y={y + 4} textAnchor="end" className="fill-stone-500 text-[11px] font-semibold">
                {formatCompactCurrency(yMax * tick)}
              </text>
              <text x={left + plotWidth + 10} y={y + 4} textAnchor="start" className="fill-stone-500 text-[11px] font-semibold">
                {formatCompactCurrency(yMax * tick)}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={left} y1={top} y2={top + plotHeight} stroke={dashboardTheme.grid} strokeWidth="1" />
        <line x1={left + plotWidth} x2={left + plotWidth} y1={top} y2={top + plotHeight} stroke={dashboardTheme.grid} strokeWidth="1" />
        {visibleSeries.map((series) => {
          const seriesPoints = chartPointsFor(series);
          const path = pathFor(seriesPoints);
          const areaPath = `${path} L ${left + plotWidth} ${top + plotHeight} L ${left} ${top + plotHeight} Z`;
          return (
            <g key={series}>
              <path d={areaPath} fill={seriesStyles[series].area} opacity={series === "gross" ? "0.22" : "0.34"} />
              <path d={path} fill="none" stroke={seriesStyles[series].line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
              {seriesPoints.map((point) => (
                <circle key={`${series}-${point.label}`} cx={point.x} cy={point.y} r="5.5" fill={seriesStyles[series].dot} />
              ))}
            </g>
          );
        })}
        {points.map((point, index) => {
          const x = left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
          const isSelected = selectedIndex === index;
          const label = formatChartDayLabel(point.label, index);
          const showLabel = index === 0 || index === points.length - 1 || index % labelInterval === 0;
          const segmentWidth = plotWidth / points.length;
          const segmentLeft = Math.max(left, x - segmentWidth / 2);
          const segmentRight = Math.min(left + plotWidth, x + segmentWidth / 2);
          return (
            <g key={point.label}>
              <rect
                x={index === 0 ? left : segmentLeft}
                y={top}
                width={index === points.length - 1 ? left + plotWidth - segmentLeft : segmentRight - segmentLeft}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setSelectedIndex(isSelected ? null : index)}
              />
              {showLabel ? (
                <>
                  <text x={x} y={height - 22} textAnchor="middle" className="fill-stone-700 text-[12px] font-bold">
                    {label.day}
                  </text>
                  <text x={x} y={height - 7} textAnchor="middle" className="fill-stone-500 text-[11px]">
                    {label.date}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
        {selectedIndex !== null ? renderTooltip(selectedIndex, "selected") : null}
        {hoveredIndex !== null && hoveredIndex !== selectedIndex ? renderTooltip(hoveredIndex, "hover") : null}
        </svg>
      </div>
    </div>
  );
}
