import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { getSession, requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calcDelays, calcSurvivalMetrics, calcAge } from "@/lib/calculations";
import { calcCharlsonIndex, calcSurgicalComplexityScore, calcTimeToRecurrenceDays } from "@/lib/esgo-metrics";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("export:deidentified");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cancerType = searchParams.get("cancer") ?? undefined;
  const province = searchParams.get("province") ?? undefined;

  const patients = await prisma.patient.findMany({
    where: {
      ...(province ? { province } : {}),
      ...(cancerType ? { diagnosis: { cancerType } } : {}),
    },
    include: {
      referral: true,
      diagnosis: true,
      imaging: true,
      surgeries: true,
      histopathology: true,
      chemotherapies: true,
      radiotherapy: true,
      complications: true,
      followUps: true,
      recurrence: true,
      survival: true,
      research: true,
    },
    orderBy: { registryNumber: "asc" },
  });

  const rows = patients.map((p, index) => {
    const delays = p.referral ? calcDelays(p.referral) : null;
    const survival = calcSurvivalMetrics({
      diagnosisDate: p.referral?.diagnosisDate,
      recurrenceDate: p.recurrence?.recurrenceDate,
      deathDate: p.survival?.deathDate,
      aliveStatus: p.survival?.aliveStatus,
    });
    const lastChemo = p.chemotherapies[p.chemotherapies.length - 1];
    const lastSurgery = p.surgeries[p.surgeries.length - 1];
    const surgicalComplexity = lastSurgery ? calcSurgicalComplexityScore(lastSurgery) : "";

    return {
      study_id: `SUBJ-${String(index + 1).padStart(4, "0")}`,
      registry_number: p.registryNumber,
      age_years: calcAge(p.dateOfBirth),
      province_code: p.province ?? "",
      district: p.district ?? "",
      marital_status_code: p.maritalStatus ?? "",
      education_code: p.educationLevel ?? "",
      hiv_status_code: p.hivStatus ?? "",
      art_status_code: p.artStatus ?? "",
      cd4_count: p.cd4Count ?? "",
      ecog_code: p.ecog ?? "",
      height_cm: p.heightCm ?? "",
      weight_kg: p.weightKg ?? "",
      bmi: p.bmi ?? "",
      charlson_index: calcCharlsonIndex(p.dateOfBirth, p.charlsonConditions),
      symptom_start_date: p.referral?.symptomStartDate?.toISOString().slice(0, 10) ?? "",
      diagnosis_date: p.referral?.diagnosisDate?.toISOString().slice(0, 10) ?? "",
      treatment_start_date: p.referral?.treatmentStartDate?.toISOString().slice(0, 10) ?? "",
      cancer_type_code: p.diagnosis?.cancerType ?? "",
      histology_code: p.diagnosis?.histology ?? "",
      grade_code: p.diagnosis?.grade ?? "",
      figo_stage_code: p.diagnosis?.figoStage ?? "",
      tnm_stage: p.diagnosis?.tnmStage ?? "",
      mdt_discussed: p.diagnosis?.mdtDiscussed ? 1 : 0,
      patient_delay_days: delays?.patientDelayDays ?? "",
      health_system_delay_days: delays?.healthSystemDelayDays ?? "",
      diagnosis_delay_days: delays?.diagnosisDelayDays ?? "",
      treatment_delay_days: delays?.treatmentDelayDays ?? "",
      time_to_treatment_days: delays?.timeToTreatmentDays ?? "",
      ultrasound_done: p.imaging?.ultrasoundDone ? 1 : 0,
      ct_done: p.imaging?.ctDone ? 1 : 0,
      mri_done: p.imaging?.mriDone ? 1 : 0,
      pet_done: p.imaging?.petDone ? 1 : 0,
      tumor_size_mm: p.imaging?.tumorSizeMm ?? "",
      pci_score: p.imaging?.pciScore ?? "",
      surgery_count: p.surgeries.length,
      cc_score_code: lastSurgery?.ccScore ?? "",
      surgical_complexity_score: surgicalComplexity,
      nodes_removed: p.histopathology?.nodesRemoved ?? "",
      positive_nodes: p.histopathology?.positiveNodes ?? "",
      lvsi: p.histopathology?.lvsi ? 1 : 0,
      p53_code: p.histopathology?.p53 ?? "",
      mmr_code: p.histopathology?.mmr ?? "",
      brca_code: p.histopathology?.brca ?? "",
      hrd_code: p.histopathology?.hrd ?? "",
      ca125: p.histopathology?.ca125 ?? "",
      he4: p.histopathology?.he4 ?? "",
      chemo_regimen_code: lastChemo?.regimen ?? "",
      chemo_cycles_planned: lastChemo?.cyclesPlanned ?? "",
      chemo_cycles_received: lastChemo?.cyclesReceived ?? "",
      ebrt_given: p.radiotherapy?.ebrtGiven ? 1 : 0,
      brachytherapy_given: p.radiotherapy?.brachytherapyGiven ? 1 : 0,
      rt_interrupted: p.radiotherapy?.interrupted ? 1 : 0,
      complication_count: p.complications.length,
      mortality_30_day: p.complications.some((c) => c.mortality30Day) ? 1 : 0,
      mortality_90_day: p.complications.some((c) => c.mortality90Day) ? 1 : 0,
      recurrence_site_code: p.recurrence?.recurrenceSite ?? "",
      time_to_recurrence_days: calcTimeToRecurrenceDays(p.referral?.diagnosisDate, p.recurrence?.recurrenceDate) ?? "",
      alive_status_code: p.survival?.aliveStatus ?? "",
      overall_survival_days: survival.overallSurvivalDays ?? "",
      pfs_days: survival.progressionFreeSurvivalDays ?? "",
      dfs_days: survival.diseaseFreeSurvivalDays ?? "",
      consent_research: p.research?.consentForResearch ? 1 : 0,
      consent_genetics: p.research?.consentForGenetics ? 1 : 0,
      tissue_bank: p.research?.tissueBank ? 1 : 0,
      blood_samples: p.research?.bloodSamples ? 1 : 0,
      follow_up_visits: p.followUps.length,
    };
  });

  await prisma.exportLog.create({
    data: {
      userId: session.id,
      filters: JSON.stringify({ cancerType, province }),
      recordCount: rows.length,
      deidentified: true,
    },
  });

  await logAudit({
    userId: session.id,
    userEmail: session.email,
    action: "EXPORT",
    entityType: "GynOncDataset",
    details: `${rows.length} de-identified records`,
  });

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="zimbabwe-gynonc-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
