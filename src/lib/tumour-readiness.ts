import { prisma } from "@/lib/db";

export async function refreshTumourReadiness(tumourId: string) {
  const t = await prisma.tumour.findUnique({
    where: { id: tumourId },
    include: { pathology: true, imaging: true, mdts: true, surgeries: true, systemicTherapies: true, radiotherapies: true },
  });
  if (!t) return;

  // A shell row is not a completed investigation. Readiness changes only when
  // at least one report contains a date or meaningful result.
  const pathologyAvailable = t.pathology.some(
    (p) => Boolean(p.reportDate || p.histology?.trim() || p.reportText?.trim()),
  );
  const imagingAvailable = t.imaging.some(
    (i) => Boolean(i.imagingDate || i.modality?.trim() || i.impression?.trim() || i.reportText?.trim()),
  );
  const latestMdt = [...t.mdts].sort((a, b) => +b.createdAt - +a.createdAt)[0];
  const hasTx = t.surgeries.length + t.systemicTherapies.length + t.radiotherapies.length > 0;

  let mdtStatus = t.mdtStatus || "Not ready";
  if (latestMdt?.status) mdtStatus = latestMdt.status;
  else if (hasTx) mdtStatus = "Treatment initiated";
  else if (pathologyAvailable && imagingAvailable) mdtStatus = "Ready—not booked";
  else if (pathologyAvailable) mdtStatus = "Awaiting imaging";
  else mdtStatus = "Awaiting histology";

  const latestStaging = await prisma.tumourStaging.findFirst({
    where: { tumourId, system: "FIGO" },
    orderBy: { createdAt: "desc" },
  });

  await prisma.tumour.update({
    where: { id: tumourId },
    data: {
      pathologyAvailable,
      imagingAvailable,
      mdtStatus,
      histology: t.pathology.at(-1)?.histology ?? t.histology,
      figoStage: latestStaging?.stage ?? t.figoStage,
      figoVersion: latestStaging?.version ?? t.figoVersion,
    },
  });
}

export async function nextTumourCode(patientId: string, registryNumber: string) {
  const count = await prisma.tumour.count({ where: { patientId } });
  return `${registryNumber}-T${count + 1}`;
}
