import { daysBetween, median, rate, calcAge } from "@/lib/calculations";
import { CHARLSON_CONDITIONS, parseCharlsonConditions } from "@/lib/comorbidities";
import type { Surgery } from "@prisma/client";

export function calcBmi(heightCm?: number | null, weightKg?: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function charlsonAgePoints(age: number): number {
  if (age < 50) return 0;
  if (age < 60) return 1;
  if (age < 70) return 2;
  if (age < 80) return 3;
  return 4;
}

export function calcCharlsonIndex(dateOfBirth: Date, conditionsJson?: string | null): number {
  const codes = parseCharlsonConditions(conditionsJson);
  const conditionPoints = CHARLSON_CONDITIONS.filter((c) => codes.includes(c.code)).reduce(
    (sum, c) => sum + c.points,
    0,
  );
  return conditionPoints + charlsonAgePoints(calcAge(dateOfBirth));
}

export function calcSurgicalComplexityScore(s: Pick<
  Surgery,
  | "bowelResection"
  | "bladderResection"
  | "uretericSurgery"
  | "stoma"
  | "transfusion"
  | "icuAdmission"
  | "operativeTimeMinutes"
  | "bloodLossMl"
>): number {
  let score = 0;
  if (s.bowelResection) score += 2;
  if (s.bladderResection) score += 2;
  if (s.uretericSurgery) score += 2;
  if (s.stoma) score += 1;
  if (s.transfusion) score += 1;
  if (s.icuAdmission) score += 1;
  if ((s.operativeTimeMinutes ?? 0) > 180) score += 1;
  if ((s.bloodLossMl ?? 0) > 1000) score += 1;
  return score;
}

export function calcTimeToRecurrenceDays(
  diagnosisDate?: Date | null,
  recurrenceDate?: Date | null,
): number | null {
  return daysBetween(diagnosisDate, recurrenceDate);
}

export type SurvivalPoint = { months: number; survivalPct: number };

/** Simple Kaplan–Meier-style curve for dashboard (months on x, % alive on y). */
export function buildOverallSurvivalCurve(
  patients: Array<{
    referral?: { diagnosisDate?: Date | null } | null;
    survival?: { aliveStatus?: string | null; deathDate?: Date | null } | null;
  }>,
): SurvivalPoint[] {
  const events = patients
    .filter((p) => p.referral?.diagnosisDate)
    .map((p) => {
      const start = p.referral!.diagnosisDate!;
      const died = p.survival?.aliveStatus === "2";
      const end = died && p.survival?.deathDate ? p.survival.deathDate : new Date();
      const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      return { months: Math.max(0, months), died };
    })
    .sort((a, b) => a.months - b.months);

  if (events.length === 0) return [];

  const points: SurvivalPoint[] = [{ months: 0, survivalPct: 100 }];
  let alive = events.length;
  const n = events.length;

  for (const e of events) {
    if (e.died) alive -= 1;
    points.push({
      months: Math.round(e.months * 10) / 10,
      survivalPct: Math.round((alive / n) * 1000) / 10,
    });
  }

  return points;
}

export function esgoQualityIndicators(patients: Array<{
  diagnosis?: { cancerType?: string | null; mdtDiscussed?: boolean; figoStage?: string | null } | null;
  referral?: { diagnosisDate?: Date | null; treatmentStartDate?: Date | null } | null;
  surgeries: Array<{ ccScore?: string | null }>;
  chemotherapies: Array<{ cyclesPlanned?: number | null; cyclesReceived?: number | null }>;
  radiotherapy?: { ebrtGiven?: boolean; interrupted?: boolean } | null;
  complications: Array<{ mortality30Day?: boolean }>;
  recurrence?: { recurrenceDate?: Date | null } | null;
}>) {
  const withDiagnosis = patients.filter((p) => p.referral?.diagnosisDate);
  const mdtRate = rate(
    patients.filter((p) => p.diagnosis?.mdtDiscussed).length,
    patients.filter((p) => p.diagnosis).length,
  );
  const treatmentIntervals = withDiagnosis
    .map((p) => daysBetween(p.referral!.diagnosisDate, p.referral!.treatmentStartDate))
    .filter((d): d is number => d != null);
  const ovarian = patients.filter((p) => p.diagnosis?.cancerType === "2");
  const optimalDebulking = rate(
    ovarian.flatMap((p) => p.surgeries).filter((s) => s.ccScore === "0" || s.ccScore === "1").length,
    ovarian.flatMap((p) => p.surgeries).length,
  );
  const chemoCourses = patients.flatMap((p) => p.chemotherapies);
  const chemoCompletion = rate(
    chemoCourses.filter((c) => c.cyclesPlanned && c.cyclesReceived && c.cyclesReceived >= c.cyclesPlanned).length,
    chemoCourses.length,
  );
  const rtPatients = patients.filter((p) => p.radiotherapy?.ebrtGiven);
  const rtCompletion = rate(
    rtPatients.filter((p) => !p.radiotherapy?.interrupted).length,
    rtPatients.length,
  );
  const complicationRate = rate(
    patients.filter((p) => p.complications.length > 0).length,
    patients.filter((p) => p.surgeries.length > 0).length,
  );
  const recurrenceRate = rate(
    patients.filter((p) => p.recurrence?.recurrenceDate).length,
    withDiagnosis.length,
  );
  const mortality30 = patients.flatMap((p) => p.complications).filter((c) => c.mortality30Day).length;

  return {
    mdtDiscussionRate: mdtRate,
    medianDiagnosisToTreatmentDays: median(treatmentIntervals),
    optimalDebulkingRate: optimalDebulking,
    chemoCompletionRate: chemoCompletion,
    rtCompletionRate: rtCompletion,
    surgicalComplicationRate: complicationRate,
    recurrenceRate,
    mortality30DayEvents: mortality30,
  };
}
