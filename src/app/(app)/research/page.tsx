import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { buildResearchMetrics } from "@/lib/research-metrics";
import type { ResearchCohortFilter } from "@/lib/research-completeness";
import { ResearchExportPanel } from "@/components/research/research-export-panel";
import { ResearchCohortFilters } from "@/components/research/research-cohort-filters";
import { DelayHistogramChart } from "@/components/research/delay-histogram-chart";
import { KaplanMeierChart } from "@/components/research/kaplan-meier-chart";
import { ResearchQuestions } from "@/components/research/research-questions";

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ consent?: string; cancer?: string; province?: string; figo?: string; hiv?: string; from?: string; to?: string }>;
}) {
  await requirePermission("reports:read");

  const params = await searchParams;
  const filter: ResearchCohortFilter = {
    consent: params.consent === "yes" || params.consent === "no" ? params.consent : "all",
    cancer: params.cancer,
    province: params.province,
    figo: params.figo,
    hiv: params.hiv,
    dateFrom: params.from,
    dateTo: params.to,
  };

  const metrics = await buildResearchMetrics(filter);
  const {
    syncedAt,
    stats,
    consentCounts,
    registrations,
    diagnosisDistribution,
    figoDistribution,
    diagnosisDelayHistogram,
    treatmentDelayHistogram,
    missingness,
    overallSurvival,
    progressionFreeSurvival,
    dataGaps,
    cohort,
    exportLogs,
    exportPreview,
    researchQuestions,
  } = metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[280px] flex-1 rounded-2xl border border-[#D5E4E2] bg-[#ECF3F2] px-5 py-4">
          <p className="font-semibold text-[#0C4F4E]">Research — synced from patient records</p>
          <p className="mt-1 text-sm text-[#45524D]">
            Charts, cohort, and export read from patient charts. Update data under{" "}
            <Link href="/patients" className="font-medium text-[#7A3B5E] underline">
              Patients
            </Link>
            .
          </p>
        </div>
        <p className="text-xs text-[#9aa5a0]">
          Snapshot: {syncedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-4 lg:grid-cols-8">
        <Stat label="In view" value={stats.total} />
        <Stat label="Registry total" value={stats.registryTotal} />
        <Stat label="Research-ready" value={stats.researchReadyCount} />
        <Stat label="Avg completeness" value={`${stats.avgCompleteness}%`} />
        <Stat label="Consent" value={stats.consentCount} />
        <Stat label="Export rows" value={exportPreview.filtered} />
        <Stat label="Median dx delay" value={stats.medianDiagnosisDelay != null ? `${stats.medianDiagnosisDelay}d` : "—"} />
        <Stat label="Median tx delay" value={stats.medianTreatmentDelay != null ? `${stats.medianTreatmentDelay}d` : "—"} />
      </div>

      {dataGaps.length > 0 ? (
        <div className="rounded-2xl border border-[#F5E6C8] bg-[#FFFBF3] p-5">
          <h2 className="text-[15px] font-semibold text-[#9A6B17]">Data quality — needs attention</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dataGaps.map((gap) => (
              <li key={gap.id} className="flex flex-wrap justify-between gap-2 border-b border-[#F0E6D0] pb-2">
                <div>
                  <Link href={`/patients/${gap.id}`} className="font-mono-data font-semibold text-[#0C4F4E] underline">
                    {gap.displayId}
                  </Link>
                  <span className="ml-2 text-[#7C8983]">{gap.percent}%</span>
                  {gap.issues[0] ? <span className="ml-2 text-[#9A6B17]">· {gap.issues[0]}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <DelayHistogramChart title="Diagnosis delay distribution" bins={diagnosisDelayHistogram} />
        <DelayHistogramChart title="Treatment delay distribution" bins={treatmentDelayHistogram} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <KaplanMeierChart curve={overallSurvival} />
        <KaplanMeierChart curve={progressionFreeSurvival} />
      </div>

      <ResearchQuestions analyses={researchQuestions} />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Registrations (12 mo)" subtitle={`${stats.registryTotal} total`}>
          <div className="flex h-[140px] items-end gap-1.5">
            {registrations.map((m) => (
              <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${m.heightPct}%`, background: m.bg }} />
                <div className="text-[10px] text-[#9aa5a0]">{m.label}</div>
              </div>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Diagnosis mix" subtitle="Filtered cohort">
          <BarList items={diagnosisDistribution.map((d) => ({ label: d.label, count: d.count, widthPct: d.widthPct, bg: d.bg }))} empty="No diagnoses in view." />
        </ChartCard>
        <ChartCard title="FIGO stage" subtitle="At diagnosis">
          <BarList items={figoDistribution} empty="No FIGO stages in view." />
        </ChartCard>
      </div>

      <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <h2 className="mb-1 text-[15px] font-semibold">Variable missingness</h2>
        <p className="mb-4 text-xs text-[#7C8983]">% of export rows with each field filled (current filters)</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#EAE5DA] text-[#7C8983]">
                <th className="py-2 pr-4">Variable</th>
                <th className="py-2 pr-4">Filled</th>
                <th className="py-2 pr-4">Missing</th>
                <th className="py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {missingness.map((row) => (
                <tr key={row.variable} className="border-b border-[#F4F0E8]">
                  <td className="py-2 pr-4">{row.label}</td>
                  <td className="py-2 pr-4 font-mono-data">{row.filled}</td>
                  <td className="py-2 pr-4 font-mono-data">{row.missing}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded bg-[#F0ECE3]">
                        <div
                          className="h-full rounded bg-[#14807E]"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                      <span className="font-mono-data text-xs">{row.percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">Research cohort</h2>
            <p className="text-xs text-[#7C8983]">{cohort.length} patients</p>
          </div>
          <Link href="/patients" className="text-[13px] text-[#7A3B5E]">
            Edit patients →
          </Link>
        </div>
        <ResearchCohortFilters filter={filter} counts={consentCounts} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#EAE5DA] text-[#7C8983]">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Diagnosis</th>
                <th className="py-2 pr-3">FIGO</th>
                <th className="py-2 pr-3">Complete</th>
                <th className="py-2 pr-3">Consent</th>
                <th className="py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {cohort.map((row) => (
                <tr key={row.id} className="border-b border-[#F4F0E8]">
                  <td className="py-2.5 pr-3">
                    <Link href={`/patients/${row.id}#research`} className="font-mono-data text-[#0C4F4E] underline">
                      {row.displayId}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">{row.diagnosis}</td>
                  <td className="py-2.5 pr-3 text-[#7C8983]">{row.figo}</td>
                  <td className="py-2.5 pr-3 font-mono-data text-xs">{row.completeness}%</td>
                  <td className="py-2.5 pr-3">{row.consent ? "Yes" : "No"}</td>
                  <td className="py-2.5 text-[#7C8983]">
                    {row.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResearchExportPanel
        rowEstimate={exportPreview.filtered}
        defaultCancer={filter.cancer}
        defaultProvince={filter.province}
        defaultFigo={filter.figo}
        defaultHiv={filter.hiv}
        defaultDateFrom={filter.dateFrom}
        defaultDateTo={filter.dateTo}
        consentOnlyDefault={filter.consent === "yes"}
      />

      {exportLogs.length > 0 ? (
        <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#7C8983] uppercase">Recent exports</p>
          <ul className="space-y-2 text-sm">
            {exportLogs.map((log) => (
              <li key={log.id} className="flex justify-between gap-2 border-b border-[#F4F0E8] py-2">
                <span>
                  {log.user.name} · {log.recordCount} records
                </span>
                <span className="text-[#9aa5a0]">{log.createdAt.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[14px] border border-[#EAE5DA] bg-white px-3 py-3">
      <div className="text-[10px] text-[#7C8983]">{label}</div>
      <div className="font-display mt-1 text-xl font-semibold text-[#0C4F4E]">{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="text-[12px] text-[#7C8983]">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function BarList({
  items,
  empty,
}: {
  items: { label: string; count: number; widthPct: number; bg: string }[];
  empty: string;
}) {
  if (items.every((i) => i.count === 0)) return <p className="text-sm text-[#7C8983]">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {items.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="truncate pr-2">{d.label}</span>
            <span className="font-mono-data text-[#7C8983]">{d.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-[#F0ECE3]">
            <div className="h-full rounded" style={{ width: `${Math.max(d.widthPct, 4)}%`, background: d.bg }} />
          </div>
        </div>
      ))}
    </div>
  );
}
