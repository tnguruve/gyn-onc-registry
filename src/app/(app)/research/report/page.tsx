import { requirePermission } from "@/lib/auth";
import { buildResearchMetrics } from "@/lib/research-metrics";
import type { ResearchCohortFilter } from "@/lib/research-completeness";
import { PrintReportButton } from "@/components/research/print-report-button";

export default async function ResearchReportPage({
  searchParams,
}: {
  searchParams: Promise<{ consent?: string; cancer?: string; province?: string; from?: string; to?: string }>;
}) {
  await requirePermission("reports:read");

  const params = await searchParams;
  const filter: ResearchCohortFilter = {
    consent: params.consent === "yes" || params.consent === "no" ? params.consent : "all",
    cancer: params.cancer,
    province: params.province,
    dateFrom: params.from,
    dateTo: params.to,
  };

  const { stats, diagnosisDistribution, reportSummary, syncedAt, missingness } =
    await buildResearchMetrics(filter);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[#1A2421] print:p-12">
      <div className="mb-8 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-[#7C8983]">Print this page or Save as PDF from your browser.</p>
        <PrintReportButton />
      </div>

      <header className="border-b border-[#EAE5DA] pb-6">
        <p className="font-mono-data text-xs tracking-widest text-[#7A3B5E] uppercase">Registry report</p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-[#0C4F4E]">
          Zimbabwe Gyn Onc Registry
        </h1>
        <p className="mt-1 text-sm text-[#5C6B66]">Parirenyatwa Group of Hospitals — de-identified summary</p>
        <p className="mt-4 text-sm text-[#7C8983]">
          Generated: {syncedAt.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </header>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Cohort summary</h2>
        <table className="w-full text-sm">
          <tbody>
            <Row label="Reporting period" value={reportSummary.periodLabel} />
            <Row label="Patients in cohort" value={String(stats.total)} />
            <Row label="Research consent rate" value={`${reportSummary.consentRate}%`} />
            <Row label="Research-ready cases" value={String(stats.researchReadyCount)} />
            <Row label="Average data completeness" value={`${stats.avgCompleteness}%`} />
            <Row label="Exportable rows (current filters)" value={String(reportSummary.exportableRows)} />
          </tbody>
        </table>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Diagnosis distribution</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[#7C8983]">
              <th className="py-2">Site</th>
              <th className="py-2">Count</th>
            </tr>
          </thead>
          <tbody>
            {diagnosisDistribution.filter((d) => d.count > 0).map((d) => (
              <tr key={d.label} className="border-b border-[#F4F0E8]">
                <td className="py-2">{d.label}</td>
                <td className="py-2 font-mono-data">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Key variable completeness</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[#7C8983]">
              <th className="py-2">Variable</th>
              <th className="py-2">% filled</th>
            </tr>
          </thead>
          <tbody>
            {missingness.slice(0, 12).map((m) => (
              <tr key={m.variable} className="border-b border-[#F4F0E8]">
                <td className="py-2">{m.label}</td>
                <td className="py-2 font-mono-data">{m.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-lg border border-[#EAE5DA] bg-[#FBFAF6] p-4 text-xs leading-relaxed text-[#5C6B66]">
        <p className="font-semibold text-[#45524D]">Data protection note</p>
        <p className="mt-2">
          This summary contains aggregate registry statistics only. Individual patient identifiers are not
          included. Full de-identified datasets are exported separately via the Research tab CSV export with
          consent and cohort filters applied.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-[#F4F0E8]">
      <td className="py-2.5 pr-4 text-[#5C6B66]">{label}</td>
      <td className="py-2.5 font-medium">{value}</td>
    </tr>
  );
}
