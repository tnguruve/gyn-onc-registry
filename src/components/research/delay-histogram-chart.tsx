import type { HistogramBin } from "@/lib/delay-histogram";

export function DelayHistogramChart({ title, bins }: { title: string; bins: HistogramBin[] }) {
  const total = bins.reduce((s, b) => s + b.count, 0);
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <div className="mb-2 text-[15px] font-semibold">{title}</div>
        <p className="text-sm text-[#7C8983]">Enter referral dates on patient charts to see delay distribution.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="text-[12px] text-[#7C8983]">{total} patients</div>
      </div>
      <div className="flex h-[140px] items-end gap-2">
        {bins.map((b) => (
          <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="font-mono-data text-[10px] text-[#7C8983]">{b.count || ""}</span>
            <div
              className="w-full max-w-[36px] rounded-t-[4px] bg-[#14807E]"
              style={{ height: `${b.heightPct}%`, minHeight: b.count > 0 ? 4 : 0 }}
              title={`${b.label}: ${b.count}`}
            />
            <div className="text-center text-[10px] leading-tight text-[#9aa5a0]">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
