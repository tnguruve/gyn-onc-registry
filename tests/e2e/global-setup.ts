import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

export const E2E_PASSWORD = "Test1234!";
export const E2E_PATIENT_REGISTRY = "GYN-E2E";

export default async function globalSetup() {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
  try {
    for (const [role, name] of [
      ["ADMIN", "E2E Administrator"],
      ["FRONT_DESK", "E2E Front Desk"],
      ["CLINICIAN", "E2E Clinician"],
      ["RESEARCHER", "E2E Researcher"],
    ] as const) {
      const email = `${role.toLowerCase().replace("_", "-")}@e2e.registry.local`;
      await prisma.user.upsert({
        where: { email },
        update: { name, role, active: true, passwordHash },
        create: { email, name, role, active: true, passwordHash },
      });
    }

    const patient = await prisma.patient.upsert({
      where: { registryNumber: E2E_PATIENT_REGISTRY },
      update: {},
      create: {
        registryNumber: E2E_PATIENT_REGISTRY,
        hospitalNumber: "E2E-HOSPITAL",
        firstName: "E2E",
        surname: "Patient",
        dateOfBirth: new Date("1985-05-10T00:00:00Z"),
        province: "2",
        country: "Zimbabwe",
      },
    });
    const tumour = await prisma.tumour.upsert({
      where: { tumourCode: "GYN-E2E-T1" },
      update: { patientId: patient.id },
      create: {
        tumourCode: "GYN-E2E-T1",
        patientId: patient.id,
        sequencePrimary: 1,
        site: "1",
        diagnosisDate: new Date("2025-01-15T00:00:00Z"),
        figoStage: "IB2",
      },
    });
    await prisma.tumourLab.deleteMany({
      where: { tumourId: tumour.id, labTest: "E2E marker" },
    });
  } finally {
    await prisma.$disconnect();
  }
}
