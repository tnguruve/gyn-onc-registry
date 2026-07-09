import { prisma } from "@/lib/db";
import { CANCER_TYPE, FIGO_STAGE, labelFor } from "@/lib/codes";
import { calcDelays, calcSurvivalMetrics, median } from "@/lib/calculations";
import { buildDelayHistogram } from "@/lib/delay-histogram";
import { buildExportRows, fetchPatientsForExport, type ExportFilters } from "@/lib/export-dataset";
import {
  buildOverallSurvivalCurve,
  buildProgressionFreeSurvivalCurve,
} from "@/lib/kaplan-meier";
import { buildMissingnessTable } from "@/lib/research-missingness";
import { formatRegistryDisplay } from "@/lib/patient-workflow";
import { buildDashboardMetrics, loadDashboardPatients } from "@/lib/dashboard-metrics";
import {
  assessPatientCompleteness,
  filterResearchCohort,
  type ResearchCohortFilter,
  type ResearchPatient,
} from "@/lib/research-completeness";

const FIGO_COLORS = ["#0C4F4E", "#14807E", "#7A3B5E", "#C98AAE", "#D8B23A", "#B8860B", "#6B8E9F", "#9A6B17"];

export async function loadResearchPatients() {
  return prisma.patient.findMany({
    include: {
      referral: true,
      diagnosis: true,
      research: true,
      surgeries: true,
      histopathology: true,
      followUps: true,
      survival: true,
      recurrence: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

const CANCER_LABELS: Record<string, string> = {
  "1": "Cervical",
  "2": "Ovarian",
  "3": "Endometrial",
  "4": "Vulval / Vaginal",
  "5": "Vulval / Vaginal",
  "6": "GTD",
  "7": "GTN",
};

const CANCER_COLORS: Record<string, string> = {
  "1": "#0C4F4E",
  "2": "#14807E",
  "3": "#7A3B5E",
  "4": "#C98AAE",
  "5": "#C98AAE",
  "6": "#D8B23A",
  "7": "#B8860B",
};

function buildDiagnosisDistribution(patients: ResearchPatient[]) {
  const withDiagnosis = patients.filter((p) => p.diagnosis?.cancerType);
  const groups = CANCER_TYPE.map((c) => {
    const count = withDiagnosis.filter((p) => {
      if (c.code === "4") return p.diagnosis?.cancerType === "4" || p.diagnosis?.cancerType === "5";
      return p.diagnosis?.cancerType === c.code;
    }).length;
    return { code: c.code, label: CANCER_LABELS[c.code] ?? c.label, count };
  }).filter((g) => g.code !== "5");

  const total = groups.reduce((s, g) => s + g.count, 0) || 1;
  return groups.map((g) => ({
    label: g.label,
    count: g.count,
    pct: Math.round((g.count / total) * 100),
    widthPct: Math.round((g.count / total) * 100),
    bg: CANCER_COLORS[g.code] ?? "#0C4F4E",
  }));
}

function buildFigoDistribution(patients: ResearchPatient[]) {
  const withStage = patients.filter((p) => p.diagnosis?.figoStage);
  const total = withStage.length || 1;
  const groups = FIGO_STAGE.map((stage) => {
    const count = withStage.filter((p) => p.diagnosis?.figoStage === stage.code).length;
    return {
      label: stage.label,
      code: stage.code,
      count,
      widthPct: Math.round((count / total) * 100),
    };
  }).filter((g) => g.count > 0);

  return groups.map((g, i) => ({ ...g, bg: FIGO_COLORS[i % FIGO_COLORS.length] }));
}

export async function buildResearchMetrics(filter: ResearchCohortFilter = {}) {
  const [allPatients, exportLogs, dashboardPatients] = await Promise.all([
    loadResearchPatients(),
    prisma.exportLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    loadDashboardPatients(),
  ]);

  const dashboard = buildDashboardMetrics(dashboardPatients);
  const consentCounts = {
    all: allPatients.length,
    yes: allPatients.filter((p) => p.research?.consentForResearch).length,
    no: allPatients.filter((p) => !p.research?.consentForResearch).length,
  };

  const patients = filterResearchCohort(allPatients, filter);

  const consentCount = patients.filter((p) => p.research?.consentForResearch).length;
  const tissueBankCount = patients.filter((p) => p.research?.tissueBank).length;
  const geneticsCount = patients.filter((p) => p.research?.consentForGenetics).length;
  const researchReadyCount = patients.filter((p) => assessPatientCompleteness(p).researchReady).length;

  const completenessPercents = patients.map((p) => assessPatientCompleteness(p).percent);
  const avgCompleteness =
    completenessPercents.length > 0
      ? Math.round(completenessPercents.reduce((a, b) => a + b, 0) / completenessPercents.length)
      : 0;

  const diagnosisDelays = patients
    .map((p) => (p.referral ? calcDelays(p.referral).diagnosisDelayDays : null))
    .filter((d): d is number => d != null && d >= 0);

  const treatmentDelays = patients
    .map((p) => (p.referral ? calcDelays(p.referral).treatmentDelayDays : null))
    .filter((d): d is number => d != null && d >= 0);

  const dataGaps = allPatients
    .map((p) => {
      const assessment = assessPatientCompleteness(p);
      if (assessment.percent >= 85 && assessment.researchReady) return null;
      return {
        id: p.id,
        displayId: formatRegistryDisplay(p.registryNumber),
        percent: assessment.percent,
        issues: assessment.issues.slice(0, 2),
        researchReady: assessment.researchReady,
      };
    })
    .filter((g): g is NonNullable<typeof g> => g != null)
    .slice(0, 8);

  const cohort = patients.map((p) => {
    const assessment = assessPatientCompleteness(p);
    return {
      id: p.id,
      displayId: formatRegistryDisplay(p.registryNumber),
      diagnosis: labelFor(CANCER_TYPE, p.diagnosis?.cancerType) || "Not recorded",
      figo: labelFor(FIGO_STAGE, p.diagnosis?.figoStage) || "—",
      consent: Boolean(p.research?.consentForResearch),
      tissueBank: Boolean(p.research?.tissueBank),
      completeness: assessment.percent,
      researchReady: assessment.researchReady,
      updatedAt: p.updatedAt,
    };
  });

  const exportFilters: ExportFilters = {
    cancerType: filter.cancer,
    province: filter.province,
    consentOnly: filter.consent === "yes",
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  };

  const fullExportPatients = await fetchPatientsForExport(exportFilters);
  const fullExportRows = buildExportRows(fullExportPatients);
  const missingness = buildMissingnessTable(fullExportRows);

  const osObservations = patients
    .map((p) => {
      const survival = calcSurvivalMetrics({
        diagnosisDate: p.referral?.diagnosisDate,
        recurrenceDate: p.recurrence?.recurrenceDate,
        deathDate: p.survival?.deathDate,
        aliveStatus: p.survival?.aliveStatus,
      });
      const days = survival.overallSurvivalDays;
      if (days == null || days < 0) return null;
      return {
        timeDays: days,
        event: p.survival?.aliveStatus === "2",
      };
    })
    .filter((o): o is { timeDays: number; event: boolean } => o != null);

  const pfsObservations = patients
    .map((p) => {
      const survival = calcSurvivalMetrics({
        diagnosisDate: p.referral?.diagnosisDate,
        recurrenceDate: p.recurrence?.recurrenceDate,
        deathDate: p.survival?.deathDate,
        aliveStatus: p.survival?.aliveStatus,
      });
      const days = survival.progressionFreeSurvivalDays;
      if (days == null || days < 0) return null;
      const recurrence = Boolean(p.recurrence?.recurrenceDate);
      const death = p.survival?.aliveStatus === "2";
      return {
        timeDays: days,
        event: recurrence || death,
      };
    })
    .filter((o): o is { timeDays: number; event: boolean } => o != null);

  const exportPreview = {
    all: allPatients.length,
    filtered: fullExportRows.length,
    consented: allPatients.filter((p) => p.research?.consentForResearch).length,
    consentedFiltered: patients.filter((p) => p.research?.consentForResearch).length,
  };

  return {
    syncedAt: new Date(),
    filter,
    stats: {
      total: patients.length,
      registryTotal: allPatients.length,
      consentCount,
      tissueBankCount,
      geneticsCount,
      researchReadyCount,
      avgCompleteness,
      medianDiagnosisDelay: median(diagnosisDelays),
      medianTreatmentDelay: median(treatmentDelays),
    },
    consentCounts,
    registrations: dashboard.registrations,
    diagnosisDistribution: buildDiagnosisDistribution(patients),
    figoDistribution: buildFigoDistribution(patients),
    diagnosisDelayHistogram: buildDelayHistogram(diagnosisDelays),
    treatmentDelayHistogram: buildDelayHistogram(treatmentDelays),
    missingness,
    overallSurvival: buildOverallSurvivalCurve(osObservations),
    progressionFreeSurvival: buildProgressionFreeSurvivalCurve(pfsObservations),
    dataGaps,
    cohort,
    exportLogs,
    exportPreview,
    reportSummary: {
      periodLabel: formatPeriodLabel(filter.dateFrom, filter.dateTo),
      consentRate:
        patients.length > 0 ? Math.round((consentCount / patients.length) * 100) : 0,
      exportableRows: fullExportRows.length,
    },
  };
}

function formatPeriodLabel(from?: string, to?: string): string {
  if (from && to) return `${from} to ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "All dates";
}

export type ResearchMetrics = Awaited<ReturnType<typeof buildResearchMetrics>>;
