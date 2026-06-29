import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logPatientViewAction } from "@/app/actions";
import { PatientRegistryChart } from "@/components/registry/patient-chart";

export const dynamic = "force-dynamic";

export default async function PatientChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireSession();
  const { id } = await params;
  const query = await searchParams;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      referral: true,
      diagnosis: true,
      imaging: true,
      surgeries: { orderBy: { surgeryDate: "desc" } },
      histopathology: true,
      chemotherapies: { orderBy: { chemoStartDate: "desc" } },
      radiotherapy: true,
      complications: { orderBy: { complicationDate: "desc" } },
      followUps: { orderBy: { visitDate: "desc" } },
      recurrence: true,
      survival: true,
      research: true,
    },
  });

  if (!patient) notFound();
  if (!hasPermission(user.role, "patients:read")) {
    notFound();
  }

  await logPatientViewAction(patient.id);

  return (
    <PatientRegistryChart
      patient={patient}
      canWrite={hasPermission(user.role, "clinical:write") || hasPermission(user.role, "patients:edit")}
      canDelete={hasPermission(user.role, "patients:delete")}
      savedModule={query.saved}
      errorMessage={query.error}
    />
  );
}
