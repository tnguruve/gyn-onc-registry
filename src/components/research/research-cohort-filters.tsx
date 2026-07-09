"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CANCER_TYPE, PROVINCES } from "@/lib/codes";
import type { ResearchCohortFilter } from "@/lib/research-completeness";

export function ResearchCohortFilters({
  filter,
  counts,
}: {
  filter: ResearchCohortFilter;
  counts: { all: number; yes: number; no: number };
}) {
  const router = useRouter();
  const consent = filter.consent ?? "all";
  const cancer = filter.cancer ?? "";
  const province = filter.province ?? "";
  const dateFrom = filter.dateFrom ?? "";
  const dateTo = filter.dateTo ?? "";

  function pushFilter(next: Partial<ResearchCohortFilter>) {
    const params = new URLSearchParams();
    const c = next.consent ?? consent;
    const ct = next.cancer !== undefined ? next.cancer : cancer;
    const pv = next.province !== undefined ? next.province : province;
    const df = next.dateFrom !== undefined ? next.dateFrom : dateFrom;
    const dt = next.dateTo !== undefined ? next.dateTo : dateTo;
    if (c && c !== "all") params.set("consent", c);
    if (ct) params.set("cancer", ct);
    if (pv) params.set("province", pv);
    if (df) params.set("from", df);
    if (dt) params.set("to", dt);
    const qs = params.toString();
    router.push(qs ? `/research?${qs}` : "/research");
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#7C8983] uppercase">Consent</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all" as const, label: `All (${counts.all})` },
              { key: "yes" as const, label: `Consented (${counts.yes})` },
              { key: "no" as const, label: `Not consented (${counts.no})` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => pushFilter({ consent: item.key })}
              className={`inline-flex h-9 items-center rounded-[10px] border px-3 text-[13px] ${
                consent === item.key
                  ? "border-[#0C4F4E] bg-[#0C4F4E] font-semibold text-white"
                  : "border-[#E2DDD3] bg-white text-[#45524D]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#7C8983] uppercase">Cancer type</p>
        <select
          className="h-9 rounded-[10px] border border-[#E2DDD3] bg-white px-3 text-[13px]"
          value={cancer}
          onChange={(e) => pushFilter({ cancer: e.target.value })}
        >
          <option value="">All types</option>
          {CANCER_TYPE.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#7C8983] uppercase">Province</p>
        <select
          className="h-9 rounded-[10px] border border-[#E2DDD3] bg-white px-3 text-[13px]"
          value={province}
          onChange={(e) => pushFilter({ province: e.target.value })}
        >
          <option value="">All provinces</option>
          {PROVINCES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} — {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#7C8983] uppercase">Diagnosis from</p>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => pushFilter({ dateFrom: e.target.value })}
          className="h-9 rounded-[10px] border border-[#E2DDD3] bg-white px-3 text-[13px]"
        />
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#7C8983] uppercase">Diagnosis to</p>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => pushFilter({ dateTo: e.target.value })}
          className="h-9 rounded-[10px] border border-[#E2DDD3] bg-white px-3 text-[13px]"
        />
      </div>
      {consent !== "all" || cancer || province || dateFrom || dateTo ? (
        <Link href="/research" className="text-[13px] text-[#7A3B5E] underline">
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
