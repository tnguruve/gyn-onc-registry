"use client";

import type { SurvivalPoint } from "@/lib/esgo-metrics";

export function SurvivalCurve({ data }: { data: SurvivalPoint[] }) {
  if (data.length < 2) {
    return <p className="text-sm text-slate-500">Not enough survival data to plot a curve yet.</p>;
  }

  const maxMonths = Math.max(...data.map((d) => d.months), 12);
  const width = 480;
  const height = 220;
  const pad = { l: 40, r: 16, t: 16, b: 32 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const path = data
    .map((d, i) => {
      const x = pad.l + (d.months / maxMonths) * innerW;
      const y = pad.t + innerH - (d.survivalPct / 100) * innerH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl" role="img" aria-label="Overall survival curve">
      <line x1={pad.l} y1={pad.t + innerH} x2={pad.l + innerW} y2={pad.t + innerH} stroke="#cbd5e1" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#cbd5e1" />
      <path d={path} fill="none" stroke="#0f766e" strokeWidth={2} />
      <text x={pad.l + innerW / 2} y={height - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">
        Months from diagnosis
      </text>
      <text x={12} y={pad.t + innerH / 2} textAnchor="middle" transform={`rotate(-90 12 ${pad.t + innerH / 2})`} className="fill-slate-500 text-[10px]">
        % alive
      </text>
    </svg>
  );
}
