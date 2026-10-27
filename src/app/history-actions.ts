"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { boolFromForm, codeFromForm } from "@/lib/codes";

function parseDate(value: FormDataEntryValue | null): Date | undefined {
  const v = String(value ?? "").trim();
  if (!v) return undefined;
  return new Date(v);
}

function parseIntField(value: FormDataEntryValue | null): number | undefined {
  const v = String(value ?? "").trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function parseFloatField(value: FormDataEntryValue | null): number | undefined {
  const v = String(value ?? "").trim();
  if (!v) return undefined;
  const n = Number.parseFloat(v);
  return Number.isNaN(n) ? undefined : n;
}

function text(formData: FormData, name: string) {
  const v = String(formData.get(name) ?? "").trim();
  return v || undefined;
}

function back(patientId: string, hash: string): never {
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/dashboard");
  redirect(`/patients/${patientId}${hash}`);
}

function schemaNotReady(patientId: string): never {
  redirect(
    `/patients/${patientId}?error=${encodeURIComponent("The new history tables are not available yet. In Terminal run npx prisma db push, stop the app, then npm run dev:mac.")}`,
  );
}

async function saveOrExplain(patientId: string, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("undefined") ||
      msg.includes("does not exist") ||
      msg.includes("Unknown") ||
      msg.includes("P2021")
    ) {
      schemaNotReady(patientId);
    }
    throw error;
  }
}

export async function saveGynHistoryAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    menarcheAge: parseIntField(formData.get("menarcheAge")),
    lmp: parseDate(formData.get("lmp")),
    menstrualStatus: codeFromForm(formData.get("menstrualStatus")),
    menopauseAge: parseIntField(formData.get("menopauseAge")),
    yearsPostmenopause: parseIntField(formData.get("yearsPostmenopause")),
    gravidity: parseIntField(formData.get("gravidity")),
    parity: parseIntField(formData.get("parity")),
    livingChildren: parseIntField(formData.get("livingChildren")),
    ageFirstPregnancy: parseIntField(formData.get("ageFirstPregnancy")),
    ageFirstBirth: parseIntField(formData.get("ageFirstBirth")),
    contraceptionEver: codeFromForm(formData.get("contraceptionEver")),
    ocp: codeFromForm(formData.get("ocp")),
    ocpDurationMonths: parseIntField(formData.get("ocpDurationMonths")),
    injectable: codeFromForm(formData.get("injectable")),
    implant: codeFromForm(formData.get("implant")),
    iud: codeFromForm(formData.get("iud")),
    screenedEver: codeFromForm(formData.get("screenedEver")),
    lastScreenDate: parseDate(formData.get("lastScreenDate")),
    screenMethod: text(formData, "screenMethod"),
    screenResult: text(formData, "screenResult"),
    previousAbnormal: codeFromForm(formData.get("previousAbnormal")),
    previousCin: codeFromForm(formData.get("previousCin")),
    cinGrade: text(formData, "cinGrade"),
    cinTreatment: text(formData, "cinTreatment"),
  };
  if (!prisma.gynHistory) schemaNotReady(patientId);
  await saveOrExplain(patientId, () =>
    prisma.gynHistory.upsert({
      where: { patientId },
      create: { patientId, ...data },
      update: data,
    }),
  );
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "GynHistory", entityId: patientId });
  back(patientId, "#gyn-history");
}

export async function saveMedicalHistoryAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    hypertension: codeFromForm(formData.get("hypertension")),
    diabetes: codeFromForm(formData.get("diabetes")),
    obesity: codeFromForm(formData.get("obesity")),
    renalDisease: codeFromForm(formData.get("renalDisease")),
    cardiacDisease: codeFromForm(formData.get("cardiacDisease")),
    tbHistory: codeFromForm(formData.get("tbHistory")),
    previousCancer: codeFromForm(formData.get("previousCancer")),
    previousRadiotherapy: codeFromForm(formData.get("previousRadiotherapy")),
    previousChemotherapy: codeFromForm(formData.get("previousChemotherapy")),
    hivStatus: codeFromForm(formData.get("hivStatus")),
    hivDiagnosisDate: parseDate(formData.get("hivDiagnosisDate")),
    artStatus: codeFromForm(formData.get("artStatus")),
    artRegimen: text(formData, "artRegimen"),
    artStartDate: parseDate(formData.get("artStartDate")),
    latestCd4: parseIntField(formData.get("latestCd4")),
    cd4Date: parseDate(formData.get("cd4Date")),
    viralLoad: text(formData, "viralLoad"),
    viralLoadDate: parseDate(formData.get("viralLoadDate")),
    smoking: codeFromForm(formData.get("smoking")),
    packYears: parseFloatField(formData.get("packYears")),
    familyCancer: codeFromForm(formData.get("familyCancer")),
  };
  if (!prisma.medicalHistory) schemaNotReady(patientId);
  await saveOrExplain(patientId, () =>
    prisma.medicalHistory.upsert({
      where: { patientId },
      create: { patientId, ...data },
      update: data,
    }),
  );
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "MedicalHistory", entityId: patientId });
  back(patientId, "#medical-history");
}

export async function addFamilyCancerAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  if (!prisma.familyCancer) schemaNotReady(patientId);
  const familyCancerId = text(formData, "familyCancerId");
  const data = {
      patientId,
      relative: text(formData, "relative"),
      cancerType: text(formData, "cancerType"),
      ageAtDiagnosis: parseIntField(formData.get("ageAtDiagnosis")),
    };
  if (familyCancerId) {
    await prisma.familyCancer.updateMany({ where: { id: familyCancerId, patientId }, data });
  } else {
    await saveOrExplain(patientId, () => prisma.familyCancer.create({ data }));
  }
  await logAudit({ userId: session.id, userEmail: session.email, action: familyCancerId ? "UPDATE" : "CREATE", entityType: "FamilyCancer", entityId: familyCancerId ?? patientId });
  back(patientId, "#medical-history");
}

export async function deleteFamilyCancerAction(patientId: string, familyCancerId: string) {
  const session = await requirePermission("clinical:write");
  const result = await prisma.familyCancer.deleteMany({ where: { id: familyCancerId, patientId } });
  if (!result.count) redirect(`/patients/${patientId}?error=${encodeURIComponent("Family cancer record not found")}`);
  await logAudit({ userId: session.id, userEmail: session.email, action: "DELETE", entityType: "FamilyCancer", entityId: familyCancerId });
  back(patientId, "#medical-history");
}

export async function savePresentingHistoryAction(patientId: string, tumourId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const symptoms: Record<string, string> = {};
  const symptomDurations: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (String(key).startsWith("sx_")) symptoms[String(key).slice(3)] = String(value);
    if (String(key).startsWith("dur_")) symptomDurations[String(key).slice(4)] = String(value);
  }
  const data = {
    chiefComplaint: text(formData, "chiefComplaint"),
    symptomOnsetDate: parseDate(formData.get("symptomOnsetDate")),
    symptomDurationMonths: parseFloatField(formData.get("symptomDurationMonths")),
    symptoms: JSON.stringify(symptoms),
    symptomDurations: JSON.stringify(symptomDurations),
  };
  if (!prisma.presentingHistory) schemaNotReady(patientId);
  const presenting = await prisma.presentingHistory.upsert({
      where: { tumourId },
      create: { tumourId, ...data },
      update: data,
    });
  await prisma.$transaction(Object.entries(symptoms).map(([symptomCode, status]) =>
    prisma.presentingSymptom.upsert({
      where: { presentingHistoryId_symptomCode: { presentingHistoryId: presenting.id, symptomCode } },
      create: {
        presentingHistoryId: presenting.id,
        symptomCode,
        status,
        durationMonths: parseFloatField(formData.get(`dur_${symptomCode}`)),
        notes: text(formData, `note_${symptomCode}`),
      },
      update: {
        status,
        durationMonths: parseFloatField(formData.get(`dur_${symptomCode}`)),
        notes: text(formData, `note_${symptomCode}`),
      },
    }),
  ));
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "PresentingHistory", entityId: tumourId });
  back(patientId, `#tumour-${tumourId}`);
}

export async function saveRiskFactorAction(patientId: string, tumourId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    hpv: codeFromForm(formData.get("hpv")),
    hrt: codeFromForm(formData.get("hrt")),
    tamoxifen: codeFromForm(formData.get("tamoxifen")),
    brca: codeFromForm(formData.get("brca")),
    notes: text(formData, "notes"),
  };
  if (!prisma.riskFactor) schemaNotReady(patientId);
  await saveOrExplain(patientId, () =>
    prisma.riskFactor.upsert({
      where: { tumourId },
      create: { tumourId, ...data },
      update: data,
    }),
  );
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "RiskFactor", entityId: tumourId });
  back(patientId, `#tumour-${tumourId}`);
}

export async function addTreatmentPlanAction(patientId: string, tumourId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  if (!prisma.treatmentPlan) schemaNotReady(patientId);
  await saveOrExplain(patientId, () => prisma.treatmentPlan.create({
    data: {
      tumourId,
      planDate: parseDate(formData.get("planDate")) ?? new Date(),
      intent: text(formData, "intent"),
      plannedSurgery: boolFromForm(formData.get("plannedSurgery")),
      plannedSystemic: boolFromForm(formData.get("plannedSystemic")),
      plannedRadiotherapy: boolFromForm(formData.get("plannedRadiotherapy")),
      plannedPalliative: boolFromForm(formData.get("plannedPalliative")),
      plannedInvestigation: boolFromForm(formData.get("plannedInvestigation")),
      mdtRecommendationId: text(formData, "mdtRecommendationId"),
      treatmentSequence: text(formData, "treatmentSequence"),
      notes: text(formData, "notes"),
    },
  }));
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "TreatmentPlan", entityId: tumourId });
  back(patientId, `#tumour-${tumourId}`);
}

export async function addReferralEpisodeAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const episodeId = text(formData, "episodeId");
  const data = {
      patientId,
      referralDate: parseDate(formData.get("referralDate")),
      referralReceived: parseDate(formData.get("referralReceived")),
      referralSource: text(formData, "referralSource"),
      referralFacility: text(formData, "referralFacility"),
      referralLevel: text(formData, "referralLevel"),
      referralReasons: JSON.stringify(formData.getAll("referralReasons").map(String).filter(Boolean)),
      suspectedCa: codeFromForm(formData.get("suspectedCa")),
      referralUrgency: text(formData, "referralUrgency"),
      firstContactDate: parseDate(formData.get("firstContactDate")),
      firstSeenDate: parseDate(formData.get("firstSeenDate")),
      previousFacilities: parseIntField(formData.get("previousFacilities")),
      referralNotes: text(formData, "referralNotes"),
      symptomStartDate: parseDate(formData.get("symptomStartDate")),
      firstFacilityVisit: parseDate(formData.get("firstFacilityVisit")),
      diagnosisDate: parseDate(formData.get("diagnosisDate")),
      treatmentStartDate: parseDate(formData.get("treatmentStartDate")),
    };
  if (episodeId) {
    const result = await prisma.referralEpisode.updateMany({ where: { id: episodeId, patientId }, data });
    if (!result.count) redirect(`/patients/${patientId}?error=${encodeURIComponent("Referral episode not found")}`);
  } else {
    await prisma.referralEpisode.create({ data });
  }
  await logAudit({ userId: session.id, userEmail: session.email, action: episodeId ? "UPDATE" : "CREATE", entityType: "ReferralEpisode", entityId: episodeId ?? patientId });
  back(patientId, "#referral-episodes");
}

export async function deleteReferralEpisodeAction(patientId: string, episodeId: string) {
  const session = await requirePermission("clinical:write");
  await prisma.referralEpisode.deleteMany({ where: { id: episodeId, patientId } });
  await logAudit({ userId: session.id, userEmail: session.email, action: "DELETE", entityType: "ReferralEpisode", entityId: episodeId });
  back(patientId, "#referral-episodes");
}

export async function savePatientOutcomeAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    lastContactDate: parseDate(formData.get("lastContactDate")),
    vitalStatus: text(formData, "vitalStatus"),
    deathDate: parseDate(formData.get("deathDate")),
    causeOfDeath: text(formData, "causeOfDeath"),
    cancerRelatedDeath: boolFromForm(formData.get("cancerRelatedDeath")),
    lostToFollowUp: boolFromForm(formData.get("lostToFollowUp")),
    lostFollowUpDate: parseDate(formData.get("lostFollowUpDate")),
  };
  await prisma.patientOutcome.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "PatientOutcome", entityId: patientId });
  back(patientId, "#patient-outcome");
}

export async function addTumourComplicationAction(patientId: string, tumourId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  if (!prisma.tumourComplication) schemaNotReady(patientId);
  await saveOrExplain(patientId, () => prisma.tumourComplication.create({
    data: {
      tumourId,
      complicationDate: parseDate(formData.get("complicationDate")),
      complicationType: text(formData, "complicationType"),
      clavienDindo: text(formData, "clavienDindo"),
      linkedProcedure: text(formData, "linkedProcedure"),
      readmission: boolFromForm(formData.get("readmission")),
      reoperation: boolFromForm(formData.get("reoperation")),
      icu: boolFromForm(formData.get("icu")),
      mortality30Day: boolFromForm(formData.get("mortality30Day")),
      mortality90Day: boolFromForm(formData.get("mortality90Day")),
    },
  }));
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "TumourComplication", entityId: tumourId });
  back(patientId, `#tumour-${tumourId}`);
}
