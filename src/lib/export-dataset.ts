import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  calcAge,
  daysBetween,
  earliestDate,
  latestDate,
} from "@/lib/calculations";
import { primarySiteFromCancerType } from "@/lib/codes";
import { calcCharlsonIndex } from "@/lib/esgo-metrics";

export type ExportFilters = {
  cancerType?: string;
  province?: string;
  figo?: string;
  hiv?: string;
  consentOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  omitDistrict?: boolean;
};

export type ExportRow = Record<string, string | number>;

function parseDateBoundary(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function buildExportTumourWhere(filters: ExportFilters): Prisma.TumourWhereInput {
  const dateFrom = parseDateBoundary(filters.dateFrom, false);
  const dateTo = parseDateBoundary(filters.dateTo, true);
  const dateRange = dateFrom || dateTo
    ? {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      }
    : undefined;
  const site = primarySiteFromCancerType(filters.cancerType) ?? filters.cancerType;
  return {
    ...(site ? { site } : {}),
    AND: [
      ...(filters.figo
        ? [{
          OR: [
            { figoStage: filters.figo },
            { stagings: { some: { OR: [{ finalStage: filters.figo }, { stage: filters.figo }] } } },
          ],
        }]
        : []),
      ...(dateRange
        ? [{ OR: [{ diagnosisDate: dateRange }, { incidenceDate: dateRange }] }]
        : []),
    ],
  };
}

export function buildExportWhere(filters: ExportFilters) {
  const tumourFilter = buildExportTumourWhere(filters);
  return {
    ...(filters.province ? { province: filters.province } : {}),
    ...(filters.consentOnly ? { research: { consentForResearch: true } } : {}),
    AND: [
      { tumours: { some: tumourFilter } },
      ...(filters.hiv
        ? [{
            OR: [
              { tumours: { some: { ...tumourFilter, hivStatus: filters.hiv } } },
              { medicalHistory: { hivStatus: filters.hiv } },
              { hivStatus: filters.hiv },
            ],
          }]
        : []),
    ],
  } satisfies Prisma.PatientWhereInput;
}

const exportInclude = {
  referral: true,
  referralEpisodes: true,
  followUps: true,
  medicalHistory: true,
  patientOutcome: true,
  research: true,
  tumours: {
    include: {
      pathology: true,
      imaging: true,
      stagings: true,
      mdts: true,
      treatmentPlans: true,
      surgeries: true,
      systemicTherapies: true,
      radiotherapies: true,
      complications: true,
      recurrences: true,
      outcomes: true,
    },
  },
} as const;

export async function fetchPatientsForExport(filters: ExportFilters = {}) {
  const where = buildExportWhere(filters);
  const patients = await prisma.patient.findMany({
    where,
    include: {
      ...exportInclude,
      tumours: {
        ...exportInclude.tumours,
        where: buildExportTumourWhere(filters),
      },
    },
    orderBy: { registryNumber: "asc" },
  });
  return patients
    .map((patient) => ({
      ...patient,
      tumours: patient.tumours.filter((tumour) => {
        const stage = [...tumour.stagings].sort((a, b) => +b.stagingDate - +a.stagingDate)[0];
        const resolvedStage = stage?.finalStage ?? stage?.stage ?? tumour.figoStage ?? "";
        const resolvedHiv = tumour.hivStatus ?? patient.medicalHistory?.hivStatus ?? patient.hivStatus ?? "";
        return (!filters.figo || resolvedStage === filters.figo) &&
          (!filters.hiv || resolvedHiv === filters.hiv);
      }),
    }))
    .filter((patient) => patient.tumours.length > 0);
}

export function buildExportRows(
  patients: Awaited<ReturnType<typeof fetchPatientsForExport>>,
  options: Pick<ExportFilters, "omitDistrict"> = {},
): ExportRow[] {
  return patients.flatMap((p, patientIndex) =>
    p.tumours.map((t) => {
      const subjectId = `SUBJ-${String(patientIndex + 1).padStart(4, "0")}`;
      const referralDates = [
        p.referral?.referralDate,
        ...p.referralEpisodes.map((episode) => episode.referralDate),
      ];
      const referralDate = earliestDate(referralDates);
      const firstSeenDate = earliestDate([
        p.referral?.dateSeenAtCancerCenter,
        ...p.referralEpisodes.map((episode) => episode.firstSeenDate),
      ]);
      const pathology = [...t.pathology].sort(
        (a, b) => +(a.reportDate ?? a.specimenDate ?? a.createdAt) - +(b.reportDate ?? b.specimenDate ?? b.createdAt),
      )[0];
      const mdt = [...t.mdts].sort(
        (a, b) => +(a.meetingDate ?? a.createdAt) - +(b.meetingDate ?? b.createdAt),
      )[0];
      const firstSurgery = earliestDate(t.surgeries.map((row) => row.surgeryDate));
      const firstSystemic = earliestDate(t.systemicTherapies.map((row) => row.therapyDate));
      const firstRadiotherapy = earliestDate(t.radiotherapies.map((row) => row.startDate));
      const firstTreatment = earliestDate([firstSurgery, firstSystemic, firstRadiotherapy]);
      const latestOutcome = [...t.outcomes].sort((a, b) => +b.statusDate - +a.statusDate)[0];
      const lastContact = latestDate([
        latestOutcome?.lastContactDate,
        p.patientOutcome?.lastContactDate,
        ...p.followUps.map((visit) => visit.visitDate),
      ]);
      const deathDate = latestOutcome?.deathDate ?? p.patientOutcome?.deathDate;
      const recurrenceDate = earliestDate(t.recurrences.map((row) => row.recurrenceDate));
      const stage = [...t.stagings].sort((a, b) => +b.stagingDate - +a.stagingDate)[0];
      const latestSurgery = [...t.surgeries].sort(
        (a, b) => +(b.surgeryDate ?? b.createdAt) - +(a.surgeryDate ?? a.createdAt),
      )[0];
      const latestSystemic = [...t.systemicTherapies].sort(
        (a, b) => +(b.therapyDate ?? b.createdAt) - +(a.therapyDate ?? a.createdAt),
      )[0];
      const latestRadiotherapy = [...t.radiotherapies].sort(
        (a, b) => +(b.startDate ?? b.createdAt) - +(a.startDate ?? a.createdAt),
      )[0];
      const ltfu = Boolean(latestOutcome?.lostToFollowUp || p.patientOutcome?.lostToFollowUp);
      const complication = t.complications.length > 0 ||
        t.surgeries.some((row) => Boolean(row.intraopComplication || row.postopComplication || row.complication));
      const diagnosisAnchor = t.diagnosisDate ?? t.incidenceDate;
      const ageAtDiagnosis = diagnosisAnchor
        ? diagnosisAnchor.getUTCFullYear() - p.dateOfBirth.getUTCFullYear() -
          (diagnosisAnchor.getUTCMonth() < p.dateOfBirth.getUTCMonth() ||
          (diagnosisAnchor.getUTCMonth() === p.dateOfBirth.getUTCMonth() &&
            diagnosisAnchor.getUTCDate() < p.dateOfBirth.getUTCDate()) ? 1 : 0)
        : calcAge(p.dateOfBirth);
      const advancedOvarian = t.site === "3" &&
        (["6", "7", "8", "9", "10", "11", "12"].includes(stage?.finalStage ?? stage?.stage ?? t.figoStage ?? "") ||
          /^(III|IV)/i.test(stage?.finalStage ?? stage?.stage ?? t.figoStage ?? ""));
      const explicitNact = t.systemicTherapies.some((therapy) =>
        `${therapy.intent ?? ""} ${therapy.therapyType ?? ""}`.toLowerCase().includes("neoadjuvant"));
      const ovarianStrategy = !advancedOvarian ? "" :
        explicitNact || Boolean(firstSystemic && (!firstSurgery || firstSystemic < firstSurgery))
          ? "NACT"
          : firstSurgery ? "Primary surgery" : "Unclassified";
      const vitalStatus = latestOutcome?.vitalStatus ?? p.patientOutcome?.vitalStatus ?? "";
      const dead = Boolean(deathDate) || ["2", "Dead", "Deceased"].includes(vitalStatus);
      const documentedMdts = t.mdts.filter((row) => Boolean(row.recommendation || row.decision));
      const implementedMdts = documentedMdts.filter((row) =>
        row.implemented === true || row.implementationDate != null);
      const radicalHysterectomies = t.surgeries.filter((row) =>
        row.procedure?.toLowerCase().includes("radical hysterectomy"));
      const radicalComplicationCount = radicalHysterectomies.filter((surgery) =>
        Boolean(surgery.complication || surgery.intraopComplication || surgery.postopComplication) ||
        t.complications.some((row) =>
          !row.linkedProcedure ||
          row.linkedProcedure === surgery.id ||
          row.linkedProcedure.toLowerCase().includes("radical hysterectomy"))
      ).length;

      const row: ExportRow = {
      study_id: subjectId,
      tumour_study_id: `${subjectId}-T${t.sequencePrimary}`,
      tumour_sequence: t.sequencePrimary,
      age_at_diagnosis_years: ageAtDiagnosis,
      sex_at_birth_code: p.sexAtBirth ?? "",
      residence_type_code: p.residenceType ?? "",
      country: p.country ?? "",
      province_code: p.province ?? "",
      district_code: p.district ?? "",
      marital_status_code: p.maritalStatus ?? "",
      education_code: p.educationLevel ?? "",
      hiv_status_code: t.hivStatus ?? p.medicalHistory?.hivStatus ?? p.hivStatus ?? "",
      art_status_code: p.medicalHistory?.artStatus ?? p.artStatus ?? "",
      cd4_count: p.medicalHistory?.latestCd4 ?? p.cd4Count ?? "",
      ecog_code: p.ecog ?? "",
      height_cm: p.heightCm ?? "",
      weight_kg: p.weightKg ?? "",
      bmi: p.bmi ?? "",
      charlson_index: calcCharlsonIndex(p.dateOfBirth, p.charlsonConditions),
      referral_date: referralDate?.toISOString().slice(0, 10) ?? "",
      first_seen_date: firstSeenDate?.toISOString().slice(0, 10) ?? "",
      referral_to_mdt_days: daysBetween(referralDate, mdt?.meetingDate) ?? "",
      referral_source_code: p.referralEpisodes[0]?.referralSource ?? p.referral?.referralSource ?? "",
      referral_level_code: p.referralEpisodes[0]?.referralLevel ?? p.referral?.referralLevel ?? "",
      incidence_date: t.incidenceDate?.toISOString().slice(0, 10) ?? "",
      diagnosis_date: t.diagnosisDate?.toISOString().slice(0, 10) ?? "",
      pathology_report_date: pathology?.reportDate?.toISOString().slice(0, 10) ?? "",
      treatment_start_date: firstTreatment?.toISOString().slice(0, 10) ?? "",
      treatment_start_year: firstTreatment?.getUTCFullYear() ?? "",
      pathology_report_to_treatment_days: daysBetween(pathology?.reportDate, firstTreatment) ?? "",
      primary_site_code: t.site,
      histology: pathology?.histology ?? t.histology ?? "",
      grade_code: pathology?.grade ?? t.tumourGrade ?? "",
      figo_stage_code: stage?.finalStage ?? stage?.stage ?? t.figoStage ?? "",
      figo_version: stage?.version ?? t.figoVersion ?? "",
      stage_iiic_cervix: t.site === "1" && ["9", "IIIC"].includes((stage?.finalStage ?? stage?.stage ?? t.figoStage ?? "").toUpperCase()) ? 1 : 0,
      icdo_topography: t.icdoTopography ?? "",
      icdo_morphology: pathology?.icdoMorphology ?? t.icdoMorphology ?? "",
      icdo_behaviour: t.icdoBehaviour ?? "",
      basis_diagnosis_code: t.basisDiagnosis ?? "",
      tumour_count: p.tumours.length,
      pathology_count: t.pathology.length,
      imaging_count: t.imaging.length,
      mdt_count: t.mdts.length,
      mdt_date: mdt?.meetingDate?.toISOString().slice(0, 10) ?? "",
      mdt_recommendation: mdt?.recommendation ?? mdt?.decision ?? "",
      mdt_implemented: mdt?.implemented == null ? "" : mdt.implemented ? 1 : 0,
      mdt_reason_not_implemented: mdt?.reasonNotImplemented ?? "",
      mdt_implementation_date: mdt?.implementationDate?.toISOString().slice(0, 10) ?? "",
      documented_mdt_recommendation_count: documentedMdts.length,
      implemented_mdt_recommendation_count: implementedMdts.length,
      treatment_plan_count: t.treatmentPlans.length,
      surgery_count: t.surgeries.length,
      first_surgery_date: firstSurgery?.toISOString().slice(0, 10) ?? "",
      surgery_procedure: latestSurgery?.procedure ?? "",
      surgery_intent: latestSurgery?.intent ?? "",
      surgery_residual_disease: latestSurgery?.residualDisease ?? "",
      surgery_cc_score: latestSurgery?.ccScore ?? "",
      systemic_count: t.systemicTherapies.length,
      first_systemic_date: firstSystemic?.toISOString().slice(0, 10) ?? "",
      systemic_type: latestSystemic?.therapyType ?? "",
      systemic_intent: latestSystemic?.intent ?? "",
      systemic_regimen: latestSystemic?.regimen ?? "",
      systemic_response: latestSystemic?.response ?? "",
      advanced_ovarian: advancedOvarian ? 1 : 0,
      ovarian_initial_strategy: ovarianStrategy,
      radiotherapy_count: t.radiotherapies.length,
      first_radiotherapy_date: firstRadiotherapy?.toISOString().slice(0, 10) ?? "",
      radiotherapy_intent: latestRadiotherapy?.intent ?? "",
      radiotherapy_completed: latestRadiotherapy?.completed ? 1 : 0,
      complication: complication ? 1 : 0,
      complication_count: t.complications.length,
      radical_hysterectomy_count: radicalHysterectomies.length,
      radical_hysterectomy_complication_count: radicalComplicationCount,
      mortality_30_day: t.complications.some((row) => row.mortality30Day) || t.surgeries.some((row) => row.mortality30d) ? 1 : 0,
      mortality_90_day: t.complications.some((row) => row.mortality90Day) || t.surgeries.some((row) => row.mortality90d) ? 1 : 0,
      recurrence_date: recurrenceDate?.toISOString().slice(0, 10) ?? "",
      time_to_recurrence_days: daysBetween(firstTreatment ?? t.diagnosisDate, recurrenceDate) ?? "",
      vital_status_code: vitalStatus,
      last_contact_date: lastContact?.toISOString().slice(0, 10) ?? "",
      death_date: deathDate?.toISOString().slice(0, 10) ?? "",
      overall_survival_days: daysBetween(t.diagnosisDate ?? t.incidenceDate, deathDate ?? lastContact) ?? "",
      overall_survival_event: dead ? 1 : 0,
      overall_survival_censored: dead ? 0 : 1,
      pfs_days: daysBetween(t.diagnosisDate ?? t.incidenceDate, recurrenceDate ?? deathDate ?? lastContact) ?? "",
      lost_to_follow_up: ltfu ? 1 : 0,
      ltfu_predictor_province: p.province ?? "",
      ltfu_predictor_residence_type: p.residenceType ?? "",
      ltfu_predictor_referral_source: p.referralEpisodes[0]?.referralSource ?? p.referral?.referralSource ?? "",
      ltfu_predictor_hiv: t.hivStatus ?? p.medicalHistory?.hivStatus ?? p.hivStatus ?? "",
      ltfu_predictor_stage: stage?.finalStage ?? stage?.stage ?? t.figoStage ?? "",
      ltfu_predictor_age: ageAtDiagnosis,
      lost_follow_up_date: (latestOutcome?.lostFollowUpDate ?? p.patientOutcome?.lostFollowUpDate)?.toISOString().slice(0, 10) ?? "",
      consent_research: p.research?.consentForResearch ? 1 : 0,
      consent_genetics: p.research?.consentForGenetics ? 1 : 0,
      tissue_bank: p.research?.tissueBank ? 1 : 0,
      blood_samples: p.research?.bloodSamples ? 1 : 0,
      follow_up_visits: p.followUps.length,
      };
      if (options.omitDistrict) delete row.district_code;
      return row;
    }),
  );
}

export const EXPORT_FILENAME = "zimbabwe-gynonc-export";
