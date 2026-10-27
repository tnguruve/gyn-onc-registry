import type {
  Diagnosis,
  MedicalHistory,
  PatientOutcome,
  ReferralEpisode,
  FollowUpVisit,
  Histopathology,
  Patient,
  Recurrence,
  Referral,
  ResearchModule,
  Surgery,
  Survival,
  Tumour,
  TumourComplication,
  TumourMdt,
  TumourOutcome,
  TumourPathology,
  TumourRadiotherapy,
  TumourRecurrence,
  TumourStaging,
  TumourSurgery,
  TumourSystemic,
} from "@prisma/client";
import { primarySiteFromCancerType } from "@/lib/codes";

export type ResearchTumour = Tumour & {
  pathology: TumourPathology[];
  stagings: TumourStaging[];
  mdts: TumourMdt[];
  surgeries: TumourSurgery[];
  systemicTherapies: TumourSystemic[];
  radiotherapies: TumourRadiotherapy[];
  complications: TumourComplication[];
  recurrences: TumourRecurrence[];
  outcomes: TumourOutcome[];
};

export type ResearchPatient = Patient & {
  referral: Referral | null;
  referralEpisodes: ReferralEpisode[];
  diagnosis: Diagnosis | null;
  research: ResearchModule | null;
  surgeries: Surgery[];
  histopathology: Histopathology | null;
  followUps: FollowUpVisit[];
  survival: Survival | null;
  recurrence: Recurrence | null;
  medicalHistory: MedicalHistory | null;
  patientOutcome: PatientOutcome | null;
  tumours: ResearchTumour[];
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
      complete: Boolean(
        (patient.referral?.referralDate || patient.referralEpisodes.some((row) => row.referralDate)) &&
        patient.tumours.some((tumour) => tumour.diagnosisDate || tumour.incidenceDate),
      ),
    },
    {
      key: "diagnosis",
      label: "Diagnosis",
      complete: Boolean(
        (patient.diagnosis?.cancerType && patient.diagnosis?.figoStage) ||
          patient.tumours?.some((t) => t.site && t.figoStage),
      ),
    },
    { key: "surgery", label: "Surgery", complete: patient.tumours.some((tumour) => tumour.surgeries.length > 0) },
    { key: "histopathology", label: "Histopathology", complete: patient.tumours.some((tumour) => tumour.pathology.length > 0) },
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
    Boolean(patient.tumours.some((tumour) => tumour.site && (tumour.diagnosisDate || tumour.incidenceDate))) &&
    Boolean(patient.research?.consentForResearch);

  return { modules, percent, researchReady, issues };
}

export type ResearchCohortFilter = {
  consent?: "all" | "yes" | "no";
  cancer?: string;
  province?: string;
  figo?: string;
  hiv?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function resolvedTumourStage(tumour: ResearchTumour): string {
  const staging = [...tumour.stagings].sort((a, b) => +b.stagingDate - +a.stagingDate)[0];
  return staging?.finalStage ?? staging?.stage ?? tumour.figoStage ?? "";
}

export function resolvedTumourHiv(patient: ResearchPatient, tumour: ResearchTumour): string {
  return tumour.hivStatus ?? patient.medicalHistory?.hivStatus ?? patient.hivStatus ?? "";
}

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
    if (filter.cancer) {
      const site = primarySiteFromCancerType(filter.cancer);
      const fromTumour = site ? p.tumours?.some((t) => t.site === site) : false;
      if (p.diagnosis?.cancerType !== filter.cancer && !fromTumour) return false;
    }
    if (filter.province && p.province !== filter.province) return false;
    if (filter.consent === "yes" && !p.research?.consentForResearch) return false;
    if (filter.consent === "no" && p.research?.consentForResearch) return false;
    if (filter.figo && !p.tumours.some((tumour) => resolvedTumourStage(tumour) === filter.figo)) return false;
    if (filter.hiv && !p.tumours.some((tumour) => resolvedTumourHiv(p, tumour) === filter.hiv)) return false;
    if (
      (filter.dateFrom || filter.dateTo) &&
      !p.tumours.some((tumour) =>
        inDateRange(tumour.diagnosisDate ?? tumour.incidenceDate, filter.dateFrom, filter.dateTo),
      )
    ) return false;
    return true;
  });
}

export function matchesExportFilters(
  patient: ResearchPatient,
  filter: { cancer?: string; province?: string; figo?: string; hiv?: string; consentOnly?: boolean; dateFrom?: string; dateTo?: string },
): boolean {
  if (filter.province && patient.province !== filter.province) return false;
  if (filter.cancer) {
    const site = primarySiteFromCancerType(filter.cancer) ?? filter.cancer;
    if (!patient.tumours.some((tumour) => tumour.site === site)) return false;
  }
  if (filter.consentOnly && !patient.research?.consentForResearch) return false;
  if (filter.figo && !patient.tumours.some((tumour) => resolvedTumourStage(tumour) === filter.figo)) return false;
  if (filter.hiv && !patient.tumours.some((tumour) => resolvedTumourHiv(patient, tumour) === filter.hiv)) return false;
  if (
    (filter.dateFrom || filter.dateTo) &&
    !patient.tumours.some((tumour) =>
      inDateRange(tumour.diagnosisDate ?? tumour.incidenceDate, filter.dateFrom, filter.dateTo),
    )
  ) return false;
  return true;
}
