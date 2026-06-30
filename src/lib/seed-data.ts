import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

export async function seedRegistry(prisma: PrismaClient) {
  const adminEmail = "admin@registry.local";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    await prisma.user.createMany({
      data: [
        {
          email: adminEmail,
          name: "System Administrator",
          passwordHash: await hash("Admin123!"),
          role: "ADMIN",
          active: true,
        },
        {
          email: "clinician@registry.local",
          name: "Dr. Guzha",
          passwordHash: await hash("Clinician123!"),
          role: "CLINICIAN",
          active: true,
        },
        {
          email: "frontdesk@registry.local",
          name: "Front Desk Staff",
          passwordHash: await hash("Frontdesk123!"),
          role: "FRONT_DESK",
          active: true,
        },
        {
          email: "researcher@registry.local",
          name: "Research Analyst",
          passwordHash: await hash("Research123!"),
          role: "RESEARCHER",
          active: true,
        },
      ],
    });
  } else {
    await prisma.user.update({
      where: { email: "clinician@registry.local" },
      data: { name: "Dr. Guzha" },
    });
  }

  const demo = await prisma.patient.findUnique({ where: { registryNumber: "GYN-0001" } });
  if (!demo) {
    const patient = await prisma.patient.create({
      data: {
        registryNumber: "GYN-0001",
        hospitalNumber: "H23456",
        firstName: "Tariro",
        surname: "Moyo",
        dateOfBirth: new Date("1990-03-12"),
        province: "2",
        district: "Harare",
        maritalStatus: "2",
        educationLevel: "3",
        occupation: "Teacher",
        phone: "+263771234567",
        hivStatus: "2",
        artStatus: "3",
        ecog: "1",
        heightCm: 165,
        weightKg: 68,
        bmi: 25.0,
        charlsonConditions: JSON.stringify(["dm"]),
      },
    });

    await prisma.referral.create({
      data: {
        patientId: patient.id,
        symptomStartDate: new Date("2025-08-01"),
        firstHealthFacilityVisit: new Date("2025-09-15"),
        referralDate: new Date("2025-10-01"),
        dateSeenAtCancerCenter: new Date("2025-10-20"),
        diagnosisDate: new Date("2025-10-25"),
        treatmentStartDate: new Date("2025-11-10"),
        referralSource: "2",
      },
    });

    await prisma.diagnosis.create({
      data: {
        patientId: patient.id,
        cancerType: "1",
        histology: "1",
        grade: "2",
        figoStage: "6",
        mdtDiscussed: true,
        mdtDate: new Date("2025-10-28"),
      },
    });

    await prisma.mdtMeeting.create({
      data: {
        patientId: patient.id,
        meetingDate: new Date("2025-10-28"),
        meetingType: "1",
        summary: "Primary plan: radical hysterectomy and adjuvant chemoradiation",
      },
    });

    await prisma.imaging.create({
      data: { patientId: patient.id, ultrasoundDone: true, ctDone: true, tumorSizeMm: 45 },
    });

    await prisma.surgery.create({
      data: {
        patientId: patient.id,
        surgeryDate: new Date("2025-11-05"),
        surgeon: "Dr. Guzha",
        procedure: "Radical hysterectomy",
        approach: "1",
        ccScore: "0",
        bloodLossMl: 400,
      },
    });

    await prisma.histopathology.create({
      data: {
        patientId: patient.id,
        nodesRemoved: 12,
        positiveNodes: 2,
        lvsi: true,
        marginStatus: "1",
        p53: "2",
        p16: "1",
        ca125: 78.5,
        betaHcg: null,
      },
    });

    await prisma.chemotherapy.create({
      data: { patientId: patient.id, regimen: "1", cyclesPlanned: 6, cyclesReceived: 5 },
    });

    await prisma.radiotherapy.create({
      data: { patientId: patient.id, ebrtGiven: true, brachytherapyGiven: true, interrupted: false },
    });

    await prisma.followUpVisit.create({
      data: {
        patientId: patient.id,
        visitDate: new Date("2026-01-15"),
        diseaseStatus: "1",
        ecog: "1",
      },
    });

    await prisma.researchModule.create({
      data: { patientId: patient.id, consentForResearch: true, tissueBank: true },
    });
  }

  return {
    message: existing ? "Demo data ready" : "Seed users and demo patient created",
    accounts: [
      { email: adminEmail, password: "Admin123!", role: "ADMIN" },
      { email: "clinician@registry.local", password: "Clinician123!", role: "CLINICIAN" },
      { email: "researcher@registry.local", password: "Research123!", role: "RESEARCHER" },
    ],
  };
}
