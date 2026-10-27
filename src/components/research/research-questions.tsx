import type { ResearchMetrics } from "@/lib/research-metrics";

type Analyses = ResearchMetrics["researchQuestions"];

function value(value: number | null, suffix = "") {
  return value == null ? "Insufficient data" : `${value}${suffix}`;
}

export function ResearchQuestions({ analyses }: { analyses: Analyses }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0C4F4E]">Ten registry research analyses</h2>
        <p className="text-sm text-[#7C8983]">Calculated from the filtered tumour cohort and patient follow-up.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AnalysisCard number="RQ1" title="Stage IIIC cervical cancers by year">
          <MiniTable
            headings={["Year", "Tumours"]}
            rows={analyses.rq1.map((row) => [String(row.year), String(row.count)])}
            empty="No stage IIIC cervical tumours with a treatment or incidence year."
          />
        </AnalysisCard>

        <AnalysisCard number="RQ2" title="HIV positivity in cervical cancer">
          <BigValue>{value(analyses.rq2.percent, "%")}</BigValue>
          <Note>{analyses.rq2.positive} positive / {analyses.rq2.known} with known HIV status</Note>
        </AnalysisCard>

        <AnalysisCard number="RQ3" title="Referral to MDT">
          <BigValue>{value(analyses.rq3.medianDays, " days")}</BigValue>
          <Note>Median among {analyses.rq3.n} tumours with both dates</Note>
        </AnalysisCard>

        <AnalysisCard number="RQ4" title="Pathology report to first treatment">
          <BigValue>{value(analyses.rq4.medianDays, " days")}</BigValue>
          <Note>Median among {analyses.rq4.n} tumours with both dates</Note>
        </AnalysisCard>

        <AnalysisCard number="RQ5" title="MDT recommendation implemented">
          <BigValue>{value(analyses.rq5.percent, "%")}</BigValue>
          <Note>{analyses.rq5.implemented} implemented / {analyses.rq5.recommended} documented recommendations</Note>
        </AnalysisCard>

        <AnalysisCard number="RQ6" title="Advanced ovarian cancer outcomes">
          <MiniTable
            headings={["Strategy", "n", "Deaths", "Recurrence", "Median follow-up"]}
            rows={analyses.rq6.map((row) => [
              row.strategy,
              String(row.n),
              `${row.deaths} (${row.deathRate ?? "—"}%)`,
              `${row.recurrences} (${row.recurrenceRate ?? "—"}%)`,
              row.medianFollowUpDays == null ? "—" : `${row.medianFollowUpDays}d`,
            ])}
          />
        </AnalysisCard>

        <AnalysisCard number="RQ7" title="Loss to follow-up">
          <BigValue>{value(analyses.rq7.percent, "%")}</BigValue>
          <Note>{analyses.rq7.lost} LTFU / {analyses.rq7.followed} patients with follow-up data</Note>
          <MiniTable
            headings={["Province", "n", "LTFU rate"]}
            rows={analyses.rq7.byProvince.map((row) => [row.province, String(row.n), `${row.rate}%`])}
            empty="No follow-up data."
          />
        </AnalysisCard>

        <AnalysisCard number="RQ8" title="Radical hysterectomy complications">
          <BigValue>{value(analyses.rq8.percent, "%")}</BigValue>
          <Note>{analyses.rq8.complications} with complications / {analyses.rq8.procedures} procedures</Note>
        </AnalysisCard>

        <AnalysisCard number="RQ9" title="Five-year overall survival by FIGO">
          <MiniTable
            headings={["FIGO", "n", "Deaths", "Censored", "5-year OS"]}
            rows={analyses.rq9.map((row) => [
              row.stage,
              String(row.curve.n),
              String(row.curve.events),
              String(row.censored),
              row.fiveYearOsPct == null ? "Insufficient" : `${row.fiveYearOsPct}%`,
            ])}
            empty="No staged tumours with survival follow-up."
          />
        </AnalysisCard>

        <AnalysisCard number="RQ10" title="Endometrial histology distribution">
          <MiniTable
            headings={["Histology", "Tumours", "%"]}
            rows={analyses.rq10.map((row) => [row.histology, String(row.count), String(row.percent ?? "—")])}
            empty="No endometrial tumours in this cohort."
          />
        </AnalysisCard>
      </div>
    </section>
  );
}

function AnalysisCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
      <p className="text-[11px] font-semibold tracking-wide text-[#7A3B5E] uppercase">{number}</p>
      <h3 className="mb-3 text-[15px] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function BigValue({ children }: { children: React.ReactNode }) {
  return <p className="font-display text-2xl font-semibold text-[#0C4F4E]">{children}</p>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-[#7C8983]">{children}</p>;
}

function MiniTable({
  headings,
  rows,
  empty,
}: {
  headings: string[];
  rows: string[][];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-[#7C8983]">{empty ?? "No data."}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b text-[#7C8983]">
            {headings.map((heading) => <th key={heading} className="py-1.5 pr-3 font-medium">{heading}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="border-b border-[#F4F0E8]">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="py-1.5 pr-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
