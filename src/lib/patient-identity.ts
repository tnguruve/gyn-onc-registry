import { prisma } from "@/lib/db";

/** Normalize national ID for comparison and storage (ignore spaces/dashes, case). */
export function normalizeNationalId(value: FormDataEntryValue | string | null | undefined): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const normalized = raw.replace(/[\s-]/g, "").toUpperCase();
  return normalized || undefined;
}

export async function findPatientByNationalId(
  nationalId: string | null | undefined,
  excludePatientId?: string,
) {
  const normalized = normalizeNationalId(nationalId);
  if (!normalized) return null;

  const candidates = await prisma.patient.findMany({
    where: {
      nationalId: { not: null },
      ...(excludePatientId ? { id: { not: excludePatientId } } : {}),
    },
    select: {
      id: true,
      nationalId: true,
      registryNumber: true,
      firstName: true,
      surname: true,
    },
  });

  return candidates.find((p) => normalizeNationalId(p.nationalId) === normalized) ?? null;
}
