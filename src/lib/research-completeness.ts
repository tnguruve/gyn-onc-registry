import type {
  Diagnosis,
  FollowUpVisit,
  Histopathology,
  Patient,
  Recurrence,
  Referral,
  ResearchModule,
  Surgery,
  Survival,
} from "@prisma/client";

export type ResearchPatient = Patient & {
  referral: Referral | null;
  diagnosis: Diagnosis | null;
  research: ResearchModule | null;
  surgeries: Surgery[];
  histopathology: Histopathology | null;
  followUps: FollowUpVisit[];
  survival: Survival | null;
  recurrence: Recurrence | null;
};

export type ModuleCompleteness = {
  key: string;
  label: string;
  complete: boolean;
};

export function assessPatientCompleteness(patient: ResearchPatient): {
  modules: ModuleCompleteness[];
  percent: number;
  researchReady: boolean;
  issues: string[];
} {
  const modules: ModuleCompleteness[] = [
    { key: "demographics", label: "Demographics", complete: Boolean(patient.province && patient.hivStatus) },
    {
      key: "referral",
      label: "Referral & delays",
      complete: Boolean(patient.referral?.symptomStartDate && patient.referral?.diagnosisDate),
    },
    { key: "diagnosis", label: "Diagnosis", complete: Boolean(patient.diagnosis?.cancerType && patient.diagnosis?.figoStage) },
    { key: "surgery", label: "Surgery", complete: patient.surgeries.length > 0 },
    { key: "histopathology", label: "Histopathology", complete: Boolean(patient.histopathology) },
    { key: "followup", label: "Follow-up", complete: patient.followUps.length > 0 },
    {
      key: "research",
      label: "Research / biobank",
      complete: Boolean(
        patient.research &&
          (patient.research.consentForResearch ||
            patient.research.consentForGenetics ||
            patient.research.tissueBank ||
            patient.research.bloodSamples),
      ),
    },
  ];

  const completeCount = modules.filter((m) => m.complete).length;
  const percent = Math.round((completeCount / modules.length) * 100);

  const issues: string[] = [];
  if (!modules.find((m) => m.key === "diagnosis")?.complete) issues.push("Diagnosis incomplete");
  if (!modules.find((m) => m.key === "referral")?.complete) issues.push("Referral dates missing — delays cannot be calculated");
  if (!patient.research) issues.push("Module 13 not saved yet");
  else if (!patient.research.consentForResearch) issues.push("Research consent not recorded");

  const researchReady =
    Boolean(patient.diagnosis?.cancerType) &&
    Boolean(patient.referral?.diagnosisDate) &&
    Boolean(patient.research?.consentForResearch);

  return { modules, percent, researchReady, issues };
}

export type ResearchCohortFilter = {
  consent?: "all" | "yes" | "no";
  cancer?: string;
  province?: string;
  dateFrom?: string;
  dateTo?: string;
};

function inDateRange(date: Date | null | undefined, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!date) return false;
  const t = date.getTime();
  if (from) {
    const f = new Date(from);
    f.setHours(0, 0, 0, 0);
    if (t < f.getTime()) return false;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

export function filterResearchCohort(patients: ResearchPatient[], filter: ResearchCohortFilter): ResearchPatient[] {
  return patients.filter((p) => {
    if (filter.cancer && p.diagnosis?.cancerType !== filter.cancer) return false;
    if (filter.province && p.province !== filter.province) return false;
    if (filter.consent === "yes" && !p.research?.consentForResearch) return false;
    if (filter.consent === "no" && p.research?.consentForResearch) return false;
    if (!inDateRange(p.referral?.diagnosisDate, filter.dateFrom, filter.dateTo)) return false;
    return true;
  });
}

export function matchesExportFilters(
  patient: ResearchPatient,
  filter: { cancer?: string; province?: string; consentOnly?: boolean; dateFrom?: string; dateTo?: string },
): boolean {
  if (filter.province && patient.province !== filter.province) return false;
  if (filter.cancer && patient.diagnosis?.cancerType !== filter.cancer) return false;
  if (filter.consentOnly && !patient.research?.consentForResearch) return false;
  if (!inDateRange(patient.referral?.diagnosisDate, filter.dateFrom, filter.dateTo)) return false;
  return true;
}
