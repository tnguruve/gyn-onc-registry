export type HistogramBin = {
  label: string;
  count: number;
  heightPct: number;
};

const BUCKETS = [
  { label: "0–30d", min: 0, max: 30 },
  { label: "31–60d", min: 31, max: 60 },
  { label: "61–90d", min: 61, max: 90 },
  { label: "91–180d", min: 91, max: 180 },
  { label: "181–365d", min: 181, max: 365 },
  { label: "365d+", min: 366, max: Infinity },
];

export function buildDelayHistogram(values: number[]): HistogramBin[] {
  const counts = BUCKETS.map((b) => ({
    label: b.label,
    count: values.filter((v) => v >= b.min && v <= b.max).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);
  return counts.map((c) => ({
    ...c,
    heightPct: Math.round((c.count / max) * 100) || 4,
  }));
}
