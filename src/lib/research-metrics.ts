import { prisma } from "@/lib/db";
import { FIGO_STAGE, PRIMARY_SITE, labelFor, primarySiteFromCancerType } from "@/lib/codes";
import { daysBetween, earliestDate, latestDate, median, rate } from "@/lib/calculations";
import { buildDelayHistogram } from "@/lib/delay-histogram";
import { buildExportRows, fetchPatientsForExport, type ExportFilters } from "@/lib/export-dataset";
import {
  buildOverallSurvivalCurve,
  buildProgressionFreeSurvivalCurve,
  buildSurvivalCurve,
  survivalAt,
} from "@/lib/kaplan-meier";
import { buildMissingnessTable } from "@/lib/research-missingness";
import { formatRegistryDisplay } from "@/lib/patient-workflow";
import { buildDashboardMetrics, loadDashboardPatients } from "@/lib/dashboard-metrics";
import {
  assessPatientCompleteness,
  filterResearchCohort,
  resolvedTumourHiv,
  resolvedTumourStage,
  type ResearchCohortFilter,
  type ResearchPatient,
  type ResearchTumour,
} from "@/lib/research-completeness";

const FIGO_COLORS = ["#0C4F4E", "#14807E", "#7A3B5E", "#C98AAE", "#D8B23A", "#B8860B", "#6B8E9F", "#9A6B17"];

export async function loadResearchPatients() {
  const include = {
    referral: true,
    referralEpisodes: true,
    diagnosis: true,
    research: true,
    surgeries: true,
    histopathology: true,
    followUps: true,
    survival: true,
    recurrence: true,
    medicalHistory: true,
    patientOutcome: true,
    tumours: {
      include: {
        pathology: true,
        stagings: true,
        mdts: true,
        surgeries: true,
        systemicTherapies: true,
        radiotherapies: true,
        complications: true,
        recurrences: true,
        outcomes: true,
      },
    },
  } as const;
  return prisma.patient.findMany({
      include,
      orderBy: { updatedAt: "desc" },
  });
}

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
  const tumours = patients.flatMap((patient) => patient.tumours);
  const groups = PRIMARY_SITE.map((site) => ({
    code: site.code,
    label: site.label,
    count: tumours.filter((tumour) => tumour.site === site.code).length,
  }));

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
  const tumours = patients.flatMap((patient) => patient.tumours);
  const withStage = tumours.filter((tumour) => tumour.figoStage);
  const total = withStage.length || 1;
  const groups = FIGO_STAGE.map((stage) => {
    const count = withStage.filter((tumour) => tumour.figoStage === stage.code).length;
    return {
      label: stage.label,
      code: stage.code,
      count,
      widthPct: Math.round((count / total) * 100),
    };
  }).filter((g) => g.count > 0);

  return groups.map((g, i) => ({ ...g, bg: FIGO_COLORS[i % FIGO_COLORS.length] }));
}

function tumourStage(tumour: ResearchTumour): string {
  return resolvedTumourStage(tumour);
}

function isStage(stage: string, code: string, label: string): boolean {
  return stage === code || stage.toUpperCase().replace(/\s/g, "") === label;
}

function firstTreatmentDate(tumour: ResearchTumour): Date | null {
  return earliestDate([
    ...tumour.surgeries.map((row) => row.surgeryDate),
    ...tumour.systemicTherapies.map((row) => row.therapyDate),
    ...tumour.radiotherapies.map((row) => row.startDate),
  ]);
}

function tumourOutcome(patient: ResearchPatient, tumour: ResearchTumour) {
  const outcome = [...tumour.outcomes].sort((a, b) => +b.statusDate - +a.statusDate)[0];
  const diagnosisDate = tumour.diagnosisDate ?? tumour.incidenceDate;
  const deathDate = outcome?.deathDate ?? patient.patientOutcome?.deathDate;
  const lastContact = latestDate([
    outcome?.lastContactDate,
    patient.patientOutcome?.lastContactDate,
    ...patient.followUps.map((visit) => visit.visitDate),
  ]);
  return {
    diagnosisDate,
    deathDate,
    lastContact,
    dead: Boolean(deathDate) || ["2", "Dead", "Deceased"].includes(outcome?.vitalStatus ?? patient.patientOutcome?.vitalStatus ?? ""),
    lost: Boolean(outcome?.lostToFollowUp || patient.patientOutcome?.lostToFollowUp),
    recurrenceDate: earliestDate(tumour.recurrences.map((row) => row.recurrenceDate)),
  };
}

function buildResearchQuestions(patients: ResearchPatient[]) {
  const pairs = patients.flatMap((patient) =>
    patient.tumours.map((tumour) => ({ patient, tumour })),
  );

  const rq1Map = new Map<number, number>();
  for (const { tumour } of pairs.filter(({ tumour }) =>
    tumour.site === "1" && isStage(tumourStage(tumour), "9", "IIIC"),
  )) {
    const date = firstTreatmentDate(tumour) ?? tumour.incidenceDate ?? tumour.diagnosisDate;
    if (date) rq1Map.set(date.getUTCFullYear(), (rq1Map.get(date.getUTCFullYear()) ?? 0) + 1);
  }
  const rq1 = [...rq1Map].sort(([a], [b]) => a - b).map(([year, count]) => ({ year, count }));

  const cervicalTumours = pairs.filter(({ tumour }) => tumour.site === "1");
  const hivKnown = cervicalTumours.filter(({ patient, tumour }) =>
    !["", "3", "9", "Unknown", "Not tested"].includes(resolvedTumourHiv(patient, tumour)),
  );
  const hivPositive = hivKnown.filter(({ patient, tumour }) =>
    ["1", "Positive", "positive"].includes(resolvedTumourHiv(patient, tumour)),
  ).length;

  const referralToMdt = pairs.flatMap(({ patient, tumour }) => {
    const referralDate = earliestDate([
      patient.referral?.referralDate,
      ...patient.referralEpisodes.map((row) => row.referralDate),
    ]);
    const mdtDate = earliestDate(tumour.mdts.map((row) => row.meetingDate));
    const days = daysBetween(referralDate, mdtDate);
    return days == null ? [] : [days];
  });

  const histologyToTreatment = pairs.flatMap(({ tumour }) => {
    const pathologyDate = earliestDate(tumour.pathology.map((row) => row.reportDate));
    const days = daysBetween(pathologyDate, firstTreatmentDate(tumour));
    return days == null ? [] : [days];
  });

  const mdtRecommended = pairs.flatMap(({ tumour }) =>
    tumour.mdts
      .filter((row) => Boolean(row.recommendation || row.decision))
      .map((mdt) => ({ mdt })),
  );
  const mdtImplemented = mdtRecommended.filter(({ mdt }) =>
    mdt.implemented === true || mdt.implementationDate != null
  ).length;

  const advancedOvarian = pairs.filter(({ tumour }) => {
    const stage = tumourStage(tumour).toUpperCase();
    return tumour.site === "3" && (
      ["6", "7", "8", "9", "10", "11", "12"].includes(stage) ||
      stage.startsWith("III") ||
      stage.startsWith("IV")
    );
  });
  const ovarianGroups = ["Primary surgery", "NACT"] as const;
  const rq6 = ovarianGroups.map((strategy) => {
    const group = advancedOvarian.filter(({ tumour }) => {
      const surgery = earliestDate(tumour.surgeries.map((row) => row.surgeryDate));
      const systemic = earliestDate(tumour.systemicTherapies.map((row) => row.therapyDate));
      const explicitNact = tumour.systemicTherapies.some((row) =>
        `${row.intent ?? ""} ${row.therapyType ?? ""}`.toLowerCase().includes("neoadjuvant"),
      );
      return strategy === "NACT"
        ? explicitNact || Boolean(systemic && (!surgery || systemic < surgery))
        : Boolean(surgery && (!systemic || surgery <= systemic));
    });
    const observations = group.flatMap(({ patient, tumour }) => {
      const outcome = tumourOutcome(patient, tumour);
      const days = daysBetween(outcome.diagnosisDate, outcome.deathDate ?? outcome.lastContact);
      return days == null ? [] : [{ timeDays: days, event: outcome.dead }];
    });
    return {
      strategy,
      n: group.length,
      deaths: group.filter(({ patient, tumour }) => tumourOutcome(patient, tumour).dead).length,
      recurrences: group.filter(({ patient, tumour }) => Boolean(tumourOutcome(patient, tumour).recurrenceDate)).length,
      deathRate: rate(group.filter(({ patient, tumour }) => tumourOutcome(patient, tumour).dead).length, group.length),
      recurrenceRate: rate(group.filter(({ patient, tumour }) => Boolean(tumourOutcome(patient, tumour).recurrenceDate)).length, group.length),
      medianFollowUpDays: median(observations.map((row) => row.timeDays)),
    };
  });

  const patientsWithFollowUp = patients.filter((patient) =>
    patient.followUps.length > 0 || patient.patientOutcome != null || patient.tumours.some((tumour) => tumour.outcomes.length > 0),
  );
  const ltfuCount = patientsWithFollowUp.filter((patient) =>
    patient.patientOutcome?.lostToFollowUp || patient.tumours.some((tumour) => tumour.outcomes.some((outcome) => outcome.lostToFollowUp)),
  ).length;
  const ltfuByProvince = [...new Set(patientsWithFollowUp.map((patient) => patient.province ?? "Unknown"))]
    .map((province) => {
      const group = patientsWithFollowUp.filter((patient) => (patient.province ?? "Unknown") === province);
      const lost = group.filter((patient) =>
        patient.patientOutcome?.lostToFollowUp || patient.tumours.some((tumour) => tumour.outcomes.some((outcome) => outcome.lostToFollowUp)),
      ).length;
      return { province, n: group.length, rate: rate(lost, group.length) ?? 0 };
    })
    .sort((a, b) => b.rate - a.rate);

  const radicalHysterectomies = pairs.flatMap(({ tumour }) =>
    tumour.surgeries
      .filter((row) => row.procedure?.toLowerCase().includes("radical hysterectomy"))
      .map((surgery) => ({ tumour, surgery })),
  );
  const radicalComplications = radicalHysterectomies.filter(({ tumour, surgery }) =>
    Boolean(surgery.complication || surgery.intraopComplication || surgery.postopComplication) ||
    tumour.complications.some((row) =>
      !row.linkedProcedure ||
      row.linkedProcedure.toLowerCase().includes("radical hysterectomy") ||
      row.linkedProcedure === surgery.id
    ),
  ).length;

  const stageObservations = new Map<string, { timeDays: number; event: boolean }[]>();
  for (const { patient, tumour } of pairs) {
    const stage = tumourStage(tumour);
    const outcome = tumourOutcome(patient, tumour);
    const days = daysBetween(outcome.diagnosisDate, outcome.deathDate ?? outcome.lastContact);
    if (!stage || days == null) continue;
    const label = labelFor(FIGO_STAGE, stage);
    stageObservations.set(label, [
      ...(stageObservations.get(label) ?? []),
      { timeDays: days, event: outcome.dead },
    ]);
  }
  const rq9 = [...stageObservations].map(([stage, observations]) => {
    const curve = buildSurvivalCurve(`FIGO ${stage}`, observations);
    const hasFiveYearObservation = observations.some((row) => row.timeDays >= 5 * 365.25);
    const estimate = hasFiveYearObservation ? survivalAt(curve, 5 * 365.25) : null;
    return {
      stage,
      curve,
      censored: observations.filter((row) => !row.event).length,
      fiveYearOsPct: estimate == null ? null : Math.round(estimate * 1000) / 10,
    };
  });

  const endometrial = pairs.filter(({ tumour }) => tumour.site === "2");
  const histologyCounts = new Map<string, number>();
  for (const { tumour } of endometrial) {
    const histology = tumour.pathology.find((row) => row.histology)?.histology ?? tumour.histology ?? "Not recorded";
    histologyCounts.set(histology, (histologyCounts.get(histology) ?? 0) + 1);
  }

  return {
    rq1,
    rq2: { positive: hivPositive, known: hivKnown.length, percent: rate(hivPositive, hivKnown.length) },
    rq3: { medianDays: median(referralToMdt), n: referralToMdt.length },
    rq4: { medianDays: median(histologyToTreatment), n: histologyToTreatment.length },
    rq5: { implemented: mdtImplemented, recommended: mdtRecommended.length, percent: rate(mdtImplemented, mdtRecommended.length) },
    rq6,
    rq7: { lost: ltfuCount, followed: patientsWithFollowUp.length, percent: rate(ltfuCount, patientsWithFollowUp.length), byProvince: ltfuByProvince.slice(0, 5) },
    rq8: { complications: radicalComplications, procedures: radicalHysterectomies.length, percent: rate(radicalComplications, radicalHysterectomies.length) },
    rq9,
    rq10: [...histologyCounts].sort((a, b) => b[1] - a[1]).map(([histology, count]) => ({
      histology,
      count,
      percent: rate(count, endometrial.length),
    })),
  };
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
  const analyticPatients = patients.map((patient) => ({
    ...patient,
    tumours: patient.tumours.filter((tumour) => {
      const site = primarySiteFromCancerType(filter.cancer);
      if (site && tumour.site !== site) return false;
      if (filter.figo && tumourStage(tumour) !== filter.figo) return false;
      if (filter.hiv && resolvedTumourHiv(patient, tumour) !== filter.hiv) return false;
      const date = tumour.diagnosisDate ?? tumour.incidenceDate;
      if ((filter.dateFrom || filter.dateTo) && !date) return false;
      if (date && filter.dateFrom && date < new Date(`${filter.dateFrom}T00:00:00`)) return false;
      if (date && filter.dateTo && date > new Date(`${filter.dateTo}T23:59:59.999`)) return false;
      return true;
    }),
  }));

  const consentCount = patients.filter((p) => p.research?.consentForResearch).length;
  const tissueBankCount = patients.filter((p) => p.research?.tissueBank).length;
  const geneticsCount = patients.filter((p) => p.research?.consentForGenetics).length;
  const researchReadyCount = patients.filter((p) => assessPatientCompleteness(p).researchReady).length;

  const completenessPercents = patients.map((p) => assessPatientCompleteness(p).percent);
  const avgCompleteness =
    completenessPercents.length > 0
      ? Math.round(completenessPercents.reduce((a, b) => a + b, 0) / completenessPercents.length)
      : 0;

  const diagnosisDelays = analyticPatients.flatMap((patient) =>
    patient.tumours.flatMap((tumour) => {
      const symptomDate = earliestDate([
        patient.referral?.symptomStartDate,
        ...patient.referralEpisodes.map((row) => row.symptomStartDate),
      ]);
      const days = daysBetween(symptomDate, tumour.diagnosisDate ?? tumour.incidenceDate);
      return days == null ? [] : [days];
    }),
  );

  const treatmentDelays = analyticPatients.flatMap((patient) =>
    patient.tumours.flatMap((tumour) => {
      const days = daysBetween(tumour.diagnosisDate ?? tumour.incidenceDate, firstTreatmentDate(tumour));
      return days == null ? [] : [days];
    }),
  );

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
      diagnosis: p.tumours.length > 0
        ? [...new Set(p.tumours.map((tumour) => labelFor(PRIMARY_SITE, tumour.site)))].join(", ")
        : "No tumour recorded",
      figo: p.tumours.map((tumour) => labelFor(FIGO_STAGE, tumour.figoStage)).filter((value) => value !== "—").join(", ") || "—",
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
    figo: filter.figo,
    hiv: filter.hiv,
  };

  const fullExportPatients = await fetchPatientsForExport(exportFilters);
  const fullExportRows = buildExportRows(fullExportPatients);
  const missingness = buildMissingnessTable(fullExportRows);

  const osObservations = analyticPatients.flatMap((patient) =>
    patient.tumours.flatMap((tumour) => {
      const outcome = tumourOutcome(patient, tumour);
      const days = daysBetween(outcome.diagnosisDate, outcome.deathDate ?? outcome.lastContact);
      return days == null ? [] : [{ timeDays: days, event: outcome.dead }];
    }),
  );

  const pfsObservations = analyticPatients.flatMap((patient) =>
    patient.tumours.flatMap((tumour) => {
      const outcome = tumourOutcome(patient, tumour);
      const days = daysBetween(
        outcome.diagnosisDate,
        outcome.recurrenceDate ?? outcome.deathDate ?? outcome.lastContact,
      );
      return days == null ? [] : [{ timeDays: days, event: Boolean(outcome.recurrenceDate) || outcome.dead }];
    }),
  );

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
    diagnosisDistribution: buildDiagnosisDistribution(analyticPatients),
    figoDistribution: buildFigoDistribution(analyticPatients),
    diagnosisDelayHistogram: buildDelayHistogram(diagnosisDelays),
    treatmentDelayHistogram: buildDelayHistogram(treatmentDelays),
    missingness,
    overallSurvival: buildOverallSurvivalCurve(osObservations),
    progressionFreeSurvival: buildProgressionFreeSurvivalCurve(pfsObservations),
    researchQuestions: buildResearchQuestions(analyticPatients),
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
