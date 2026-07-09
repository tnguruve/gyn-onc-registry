import type { KaplanMeierCurve } from "@/lib/kaplan-meier";

export function KaplanMeierChart({ curve }: { curve: KaplanMeierCurve }) {
  if (curve.insufficient || curve.points.length < 2) {
    return (
      <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <div className="mb-1 text-[15px] font-semibold">{curve.label}</div>
        <p className="text-sm text-[#7C8983]">{curve.message ?? "Not enough follow-up data yet."}</p>
        <p className="mt-2 text-xs text-[#9aa5a0]">
          n={curve.n} · events={curve.events}
        </p>
      </div>
    );
  }

  const maxTime = Math.max(...curve.points.map((p) => p.timeDays), 1);
  const width = 280;
  const height = 160;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  const coords = curve.points.map((p) => ({
    x: pad.l + (p.timeDays / maxTime) * plotW,
    y: pad.t + (1 - p.survival) * plotH,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  return (
    <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-[15px] font-semibold">{curve.label}</div>
        <div className="text-[11px] text-[#7C8983]">
          n={curve.n} · events={curve.events}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[320px]" role="img" aria-label={curve.label}>
        <line x1={pad.l} y1={pad.t + plotH} x2={pad.l + plotW} y2={pad.t + plotH} stroke="#E2DDD3" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="#E2DDD3" />
        <text x={pad.l} y={height - 6} fontSize="9" fill="#9aa5a0">
          0
        </text>
        <text x={pad.l + plotW - 20} y={height - 6} fontSize="9" fill="#9aa5a0">
          {maxTime}d
        </text>
        <text x={4} y={pad.t + 8} fontSize="9" fill="#9aa5a0">
          100%
        </text>
        <text x={4} y={pad.t + plotH} fontSize="9" fill="#9aa5a0">
          0%
        </text>
        <path d={pathD} fill="none" stroke="#0C4F4E" strokeWidth="2" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#7A3B5E" />
        ))}
      </svg>
    </div>
  );
}
