export function daysBetween(start?: Date | null, end?: Date | null): number | null {
  if (!start || !end) return null;
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function calcAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

type ReferralDates = {
  symptomStartDate?: Date | null;
  firstHealthFacilityVisit?: Date | null;
  referralDate?: Date | null;
  diagnosisDate?: Date | null;
  treatmentStartDate?: Date | null;
};

export function calcDelays(r: ReferralDates) {
  return {
    patientDelayDays: daysBetween(r.symptomStartDate, r.firstHealthFacilityVisit),
    healthSystemDelayDays: daysBetween(r.firstHealthFacilityVisit, r.referralDate),
    diagnosisDelayDays: daysBetween(r.symptomStartDate, r.diagnosisDate),
    treatmentDelayDays: daysBetween(r.diagnosisDate, r.treatmentStartDate),
    timeToTreatmentDays: daysBetween(r.symptomStartDate, r.treatmentStartDate),
  };
}

type SurvivalInput = {
  diagnosisDate?: Date | null;
  recurrenceDate?: Date | null;
  deathDate?: Date | null;
  aliveStatus?: string | null;
};

export function calcSurvivalMetrics(input: SurvivalInput) {
  const end =
    input.aliveStatus === "2" && input.deathDate
      ? input.deathDate
      : new Date();

  return {
    overallSurvivalDays: daysBetween(input.diagnosisDate, end),
    progressionFreeSurvivalDays:
      input.recurrenceDate != null
        ? daysBetween(input.diagnosisDate, input.recurrenceDate)
        : daysBetween(input.diagnosisDate, end),
    diseaseFreeSurvivalDays:
      input.recurrenceDate != null
        ? daysBetween(input.diagnosisDate, input.recurrenceDate)
        : daysBetween(input.diagnosisDate, end),
  };
}

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}
