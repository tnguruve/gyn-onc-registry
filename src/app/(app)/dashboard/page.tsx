import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { calcDelays, median } from "@/lib/calculations";
import { buildOverallSurvivalCurve, esgoQualityIndicators } from "@/lib/esgo-metrics";
import { CANCER_TYPE, FIGO_STAGE, labelFor } from "@/lib/codes";
import { SurvivalCurve } from "@/components/registry/survival-curve";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireSession();

  const patients = await prisma.patient.findMany({
    include: {
      referral: true,
      diagnosis: true,
      surgeries: true,
      chemotherapies: true,
      radiotherapy: true,
      complications: true,
      recurrence: true,
      survival: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const thisMonth = patients.filter(
    (p) => p.createdAt.getMonth() === now.getMonth() && p.createdAt.getFullYear() === now.getFullYear(),
  ).length;

  const diagnosisDelays = patients
    .map((p) => (p.referral ? calcDelays(p.referral).diagnosisDelayDays : null))
    .filter((d): d is number => d != null);

  const treatmentDelays = patients
    .map((p) => (p.referral ? calcDelays(p.referral).treatmentDelayDays : null))
    .filter((d): d is number => d != null);

  const esgo = esgoQualityIndicators(patients);
  const survivalCurve = buildOverallSurvivalCurve(patients);

  const cervicalStages = patients
    .filter((p) => p.diagnosis?.cancerType === "1")
    .reduce<Record<string, number>>((acc, p) => {
      const stage = p.diagnosis?.figoStage ?? "unknown";
      acc[stage] = (acc[stage] ?? 0) + 1;
      return acc;
    }, {});

  const recent = patients.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registry dashboard</h1>
          <p className="text-sm text-slate-600">ESGO/SGO-style quality indicators · Parirenyatwa Gyn Onc Registry</p>
        </div>
        {hasPermission(user.role, "patients:create") && (
          <Link href="/patients/new"><Button>Register patient</Button></Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicator title="Total cases" value={patients.length} />
        <Indicator title="New cases this month" value={thisMonth} />
        <Indicator title="Median diagnosis delay (days)" value={median(diagnosisDelays)} />
        <Indicator title="Median treatment delay (days)" value={median(treatmentDelays)} />
        <Indicator title="MDT discussion rate" value={esgo.mdtDiscussionRate != null ? `${esgo.mdtDiscussionRate}%` : "—"} />
        <Indicator title="Median diagnosis → treatment (days)" value={esgo.medianDiagnosisToTreatmentDays} />
        <Indicator title="Optimal debulking CC-0/1 (ovarian)" value={esgo.optimalDebulkingRate != null ? `${esgo.optimalDebulkingRate}%` : "—"} />
        <Indicator title="Surgical complication rate" value={esgo.surgicalComplicationRate != null ? `${esgo.surgicalComplicationRate}%` : "—"} />
        <Indicator title="Chemo completion rate" value={esgo.chemoCompletionRate != null ? `${esgo.chemoCompletionRate}%` : "—"} />
        <Indicator title="RT completion rate" value={esgo.rtCompletionRate != null ? `${esgo.rtCompletionRate}%` : "—"} />
        <Indicator title="Recurrence rate" value={esgo.recurrenceRate != null ? `${esgo.recurrenceRate}%` : "—"} />
        <Indicator title="30-day mortality events" value={esgo.mortality30DayEvents} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Overall survival curve</CardTitle></CardHeader>
          <CardContent>
            <SurvivalCurve data={survivalCurve} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cervical cancer — FIGO stage distribution</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {Object.entries(cervicalStages).map(([stage, count]) => (
                <li key={stage} className="flex justify-between">
                  <span>{labelFor(FIGO_STAGE, stage === "unknown" ? null : stage)}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
              {Object.keys(cervicalStages).length === 0 && <li className="text-slate-500">No cervical cases yet.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Cancer site breakdown (disease-specific modules)</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {CANCER_TYPE.map((c) => {
              const count = patients.filter((p) => p.diagnosis?.cancerType === c.code).length;
              return (
                <li key={c.code} className="flex justify-between rounded border border-slate-100 px-3 py-2">
                  <span>{c.label}</span>
                  <span className="font-medium">{count}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recently registered</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No patients yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((p) => (
                <li key={p.id} className="flex justify-between py-3 text-sm">
                  <span>{p.registryNumber} — {p.surname}, {p.firstName}</span>
                  <Link href={`/patients/${p.id}`} className="text-teal-700 underline">Open chart</Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Indicator({ title, value }: { title: string; value: string | number | null }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-semibold text-teal-800">{value ?? "—"}</p></CardContent>
    </Card>
  );
}
