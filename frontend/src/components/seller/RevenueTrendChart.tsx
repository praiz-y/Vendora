"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/currency";
import type { SellerRevenueTrendPoint } from "@/types/sellerDashboard";

const WIDTH = 600;
const HEIGHT = 220;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const PADDING_X = 8;
const PLOT_WIDTH = WIDTH - PADDING_X * 2;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Single-series line chart, no charting library — one axis, one hue (the
// brand Primary token, matching the rest of the app), thin 2px line, a
// direct-labeled endpoint instead of a legend (a single series names
// itself via the section heading, per the dataviz skill's rule). Crosshair
// + tooltip on hover.
export function RevenueTrendChart({ data }: { data: SellerRevenueTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const values = data.map((d) => Number(d.revenue));
  const maxValue = Math.max(...values, 1);
  const stepX = data.length > 1 ? PLOT_WIDTH / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PADDING_X + i * stepX,
    y: PADDING_TOP + PLOT_HEIGHT - (values[i] / maxValue) * PLOT_HEIGHT,
    value: values[i],
    date: d.date,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const floorY = PADDING_TOP + PLOT_HEIGHT;
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${floorY} L${points[0].x.toFixed(1)},${floorY} Z`;

  const gridFractions = [0, 0.5, 1];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const last = points[points.length - 1];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Revenue over the last 30 days"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridFractions.map((f) => {
          const y = PADDING_TOP + PLOT_HEIGHT - f * PLOT_HEIGHT;
          return <line key={f} x1={PADDING_X} x2={WIDTH - PADDING_X} y1={y} y2={y} className="stroke-border" strokeWidth={1} />;
        })}

        <path d={areaPath} className="fill-primary/10" />
        <path d={linePath} className="fill-none stroke-primary" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r={4} className="fill-primary" />

        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - stepX / 2}
            y={PADDING_TOP}
            width={Math.max(stepX, 4)}
            height={PLOT_HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}

        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PADDING_TOP}
              y2={floorY}
              className="stroke-border-strong"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} className="fill-primary stroke-surface" strokeWidth={2} />
          </>
        )}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={p.x} y={HEIGHT - 8} textAnchor="middle" className="fill-light" style={{ fontSize: 9 }}>
              {formatShortDate(p.date)}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-md"
          style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
        >
          <p className="font-medium text-heading">{formatNaira(hovered.value)}</p>
          <p className="text-light">{formatShortDate(hovered.date)}</p>
        </div>
      )}
    </div>
  );
}
