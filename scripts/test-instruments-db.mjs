/**
 * Optional, read-only integration check for the 22 registry instruments.
 * Requires DATABASE_URL and a generated Prisma client.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = await readFile(resolve(root, "prisma/schema.prisma"), "utf8");
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(resolve(root, ".env"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
const prisma = new PrismaClient();

const instruments = [
  ["Patient Registration", "Patient", "patient"],
  ["Referral & Care Pathway", "ReferralEpisode", "referralEpisode"],
  ["Presenting History", "PresentingHistory", "presentingHistory"],
  ["Gynaecological & Obstetric History", "GynHistory", "gynHistory"],
  ["Medical, Family & Social History", "MedicalHistory", "medicalHistory"],
  ["Cancer-specific Risk Factors", "RiskFactor", "riskFactor"],
  ["Clinical Examination", "ClinicalAssessment", "clinicalAssessment"],
  ["Tumour Registration", "Tumour", "tumour"],
  ["Pathology", "TumourPathology", "tumourPathology"],
  ["Laboratory Results", "TumourLab", "tumourLab"],
  ["Imaging", "TumourImaging", "tumourImaging"],
  ["Staging", "TumourStaging", "tumourStaging"],
  ["MDT Preparation", "MdtPreparation", "mdtPreparation"],
  ["MDT Discussion", "TumourMdt", "tumourMdt"],
  ["Treatment Plan", "TreatmentPlan", "treatmentPlan"],
  ["Surgery", "TumourSurgery", "tumourSurgery"],
  ["Systemic Therapy", "TumourSystemic", "tumourSystemic"],
  ["Radiotherapy", "TumourRadiotherapy", "tumourRadiotherapy"],
  ["Complications", "TumourComplication", "tumourComplication"],
  ["Follow-up", "FollowUpVisit", "followUpVisit"],
  ["Recurrence / Progression", "TumourRecurrence", "tumourRecurrence"],
  ["Outcome / Vital Status", "TumourOutcome", "tumourOutcome"],
];

try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for this optional integration check.");
  }

  for (const [label, model, delegateName] of instruments) {
    if (!new RegExp(`^model\\s+${model}\\s+\\{`, "m").test(schema)) {
      throw new Error(`${label}: model ${model} is missing from prisma/schema.prisma`);
    }
    const delegate = prisma[delegateName];
    if (!delegate || typeof delegate.count !== "function") {
      throw new Error(`${label}: Prisma delegate ${delegateName} is unavailable`);
    }
    const count = await delegate.count();
    console.log(`✓ ${label} (${model}): ${count} row${count === 1 ? "" : "s"}`);
  }

  console.log(`✓ All ${instruments.length} instrument models are readable (no writes performed).`);
} catch (error) {
  console.error(`✗ Instrument database check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
