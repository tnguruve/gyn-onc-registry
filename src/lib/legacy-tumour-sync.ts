import { prisma } from "@/lib/db";
import { primarySiteFromCancerType } from "@/lib/codes";
import { nextTumourCode, refreshTumourReadiness } from "@/lib/tumour-readiness";

/**
 * Keep the 13-module chart and the tumour queues in step: the first tumour
 * is created/updated from diagnosis, and first pathology/imaging/MDT/treatment
 * rows are copied once so queues move without a second data entry.
 */
async function ignoreMissingTable<T>(work: () => Promise<T>): Promise<T | undefined> {
  try {
    return await work();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("does not exist") || msg.includes("Unknown arg") || msg.includes("Tumour")) {
      console.error("legacy-tumour-sync skipped:", msg);
      return undefined;
    }
    throw error;
  }
}

export async function syncDiagnosisToTumour(
  patientId: string,
  diagnosis: {
    cancerType?: string | null;
    histology?: string | null;
    grade?: string | null;
    figoStage?: string | null;
    figoVersion?: string | null;
  },
) {
  return ignoreMissingTable(async () => {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) return;

  const site = primarySiteFromCancerType(diagnosis.cancerType);
  const existing = await prisma.tumour.findFirst({
    where: { patientId },
    orderBy: { sequencePrimary: "asc" },
  });

  if (!existing) {
    if (!site) return;
    const tumour = await prisma.tumour.create({
      data: {
        patientId,
        tumourCode: await nextTumourCode(patientId, patient.registryNumber),
        sequencePrimary: 1,
        site,
        histology: diagnosis.histology ?? undefined,
        tumourGrade: diagnosis.grade ?? undefined,
        figoStage: diagnosis.figoStage ?? undefined,
        figoVersion: diagnosis.figoVersion ?? undefined,
        hivStatus: patient.hivStatus ?? undefined,
        diagnosisDate: undefined,
      },
    });
    await refreshTumourReadiness(tumour.id);
    return;
  }

  await prisma.tumour.update({
    where: { id: existing.id },
    data: {
      site: site ?? existing.site,
      histology: diagnosis.histology ?? existing.histology,
      tumourGrade: diagnosis.grade ?? existing.tumourGrade,
      figoStage: diagnosis.figoStage ?? existing.figoStage,
      figoVersion: diagnosis.figoVersion ?? existing.figoVersion,
    },
  });
  await refreshTumourReadiness(existing.id);
  });
}

async function firstTumourId(patientId: string): Promise<string | null> {
  const t = await ignoreMissingTable(() =>
    prisma.tumour.findFirst({
      where: { patientId },
      orderBy: { sequencePrimary: "asc" },
      select: { id: true },
    }),
  );
  return t?.id ?? null;
}

export async function syncFirstPathology(patientId: string, data: {
  pathologyDate?: Date;
  histology?: string | null;
  grade?: string | null;
  lvsi?: boolean;
  nodesRemoved?: number | null;
  positiveNodes?: number | null;
}) {
  const tumourId = await firstTumourId(patientId);
  if (!tumourId) return;
  const count = await prisma.tumourPathology.count({ where: { tumourId } });
  if (count > 0) return;
  if (!data.pathologyDate && !data.histology) return;
  await prisma.tumourPathology.create({
    data: {
      tumourId,
      specimenDate: data.pathologyDate,
      reportDate: data.pathologyDate,
      histology: data.histology ?? undefined,
      grade: data.grade ?? undefined,
      lvsi: data.lvsi ? "Present" : undefined,
      nodesExamined: data.nodesRemoved ?? undefined,
      nodesPositive: data.positiveNodes ?? undefined,
    },
  });
  await refreshTumourReadiness(tumourId);
}

export async function syncFirstImaging(patientId: string, data: {
  ctDone?: boolean;
  mriDone?: boolean;
  ultrasoundDone?: boolean;
  petDone?: boolean;
}) {
  const tumourId = await firstTumourId(patientId);
  if (!tumourId) return;
  const count = await prisma.tumourImaging.count({ where: { tumourId } });
  if (count > 0) return;
  const modality = data.petDone
    ? "PET-CT"
    : data.mriDone
      ? "MRI"
      : data.ctDone
        ? "CT"
        : data.ultrasoundDone
          ? "Ultrasound"
          : null;
  if (!modality) return;
  await prisma.tumourImaging.create({
    data: { tumourId, imagingDate: new Date(), modality },
  });
  await refreshTumourReadiness(tumourId);
}

export async function syncFirstMdt(patientId: string, meetingDate: Date, summary?: string) {
  const tumourId = await firstTumourId(patientId);
  if (!tumourId) return;
  await prisma.tumourMdt.create({
    data: {
      tumourId,
      meetingDate,
      status: "Discussed",
      notes: summary,
    },
  });
  await refreshTumourReadiness(tumourId);
}

export async function syncFirstSurgery(patientId: string, data: {
  surgeryDate: Date;
  procedure?: string | null;
  residualDisease?: string | null;
}) {
  const tumourId = await firstTumourId(patientId);
  if (!tumourId) return;
  await prisma.tumourSurgery.create({
    data: {
      tumourId,
      surgeryDate: data.surgeryDate,
      procedure: data.procedure ?? undefined,
      residualDisease: data.residualDisease ?? undefined,
    },
  });
  await refreshTumourReadiness(tumourId);
}

export async function syncFirstSystemic(patientId: string, data: {
  chemoStartDate?: Date;
  regimen?: string | null;
}) {
  const tumourId = await firstTumourId(patientId);
  if (!tumourId) return;
  await prisma.tumourSystemic.create({
    data: {
      tumourId,
      therapyDate: data.chemoStartDate,
      regimen: data.regimen ?? undefined,
    },
  });
  await refreshTumourReadiness(tumourId);
}

export async function syncFirstRadiotherapy(patientId: string, data: {
  ebrtGiven?: boolean;
  ebrtStart?: Date;
  doseGy?: number | null;
  brachytherapyGiven?: boolean;
}) {
  const tumourId = await firstTumourId(patientId);
  if (!tumourId) return;
  const count = await prisma.tumourRadiotherapy.count({ where: { tumourId } });
  if (count > 0) return;
  if (!data.ebrtGiven && !data.brachytherapyGiven) return;
  await prisma.tumourRadiotherapy.create({
    data: {
      tumourId,
      startDate: data.ebrtStart,
      ebrtDose: data.doseGy != null ? `${data.doseGy} Gy` : undefined,
      brachytherapy: Boolean(data.brachytherapyGiven),
    },
  });
  await refreshTumourReadiness(tumourId);
}
