import { requirePermission } from "@/lib/auth";
import { buildResearchMetrics } from "@/lib/research-metrics";
import type { ResearchCohortFilter } from "@/lib/research-completeness";
import { PrintReportButton } from "@/components/research/print-report-button";

export default async function ResearchReportPage({
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

  const { stats, diagnosisDistribution, reportSummary, syncedAt, missingness, researchQuestions } =
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
        <h2 className="text-lg font-semibold">Reproducible research results</h2>
        <table className="w-full text-sm">
          <tbody>
            <Row label="RQ1 stage IIIC cervix treated" value={researchQuestions.rq1.map((r) => `${r.year}: ${r.count}`).join("; ") || "Insufficient data"} />
            <Row label="RQ2 cervical HIV prevalence" value={researchQuestions.rq2.percent == null ? "Insufficient data" : `${researchQuestions.rq2.percent}% (${researchQuestions.rq2.positive}/${researchQuestions.rq2.known} known)`} />
            <Row label="RQ3 median referral to first MDT" value={researchQuestions.rq3.medianDays == null ? "Insufficient data" : `${researchQuestions.rq3.medianDays} days (n=${researchQuestions.rq3.n})`} />
            <Row label="RQ4 median pathology report to treatment" value={researchQuestions.rq4.medianDays == null ? "Insufficient data" : `${researchQuestions.rq4.medianDays} days (n=${researchQuestions.rq4.n})`} />
            <Row label="RQ5 MDT implementation" value={researchQuestions.rq5.percent == null ? "Insufficient data" : `${researchQuestions.rq5.percent}% (${researchQuestions.rq5.implemented}/${researchQuestions.rq5.recommended})`} />
            <Row label="RQ6 advanced ovarian groups" value={researchQuestions.rq6.map((r) => `${r.strategy}: n=${r.n}, deaths=${r.deaths}, recurrences=${r.recurrences}`).join("; ")} />
            <Row label="RQ7 loss to follow-up" value={researchQuestions.rq7.percent == null ? "Insufficient data" : `${researchQuestions.rq7.percent}% (${researchQuestions.rq7.lost}/${researchQuestions.rq7.followed})`} />
            <Row label="RQ8 radical hysterectomy complications" value={researchQuestions.rq8.percent == null ? "Insufficient data" : `${researchQuestions.rq8.percent}% (${researchQuestions.rq8.complications}/${researchQuestions.rq8.procedures})`} />
            <Row label="RQ9 five-year OS by FIGO" value={researchQuestions.rq9.map((r) => `FIGO ${r.stage}: ${r.fiveYearOsPct == null ? "insufficient" : `${r.fiveYearOsPct}%`}`).join("; ") || "Insufficient data"} />
            <Row label="RQ10 endometrial histology" value={researchQuestions.rq10.map((r) => `${r.histology}: ${r.count} (${r.percent ?? 0}%)`).join("; ") || "Insufficient data"} />
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
