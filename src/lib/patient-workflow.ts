import type {
  Diagnosis,
  FollowUpVisit,
  MdtMeeting,
  Patient,
  Referral,
  Surgery,
} from "@prisma/client";
import { hasPreTheatreMdt } from "@/lib/mdt";

export const WORKFLOW_STATUSES = [
  "DRAFT",
  "IN_TREATMENT",
  "MDT_PENDING",
  "FOLLOW_UP",
  "SURVEILLANCE",
  "SURGERY_BOOKED",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export type PatientWorkflowInput = Patient & {
  referral: Referral | null;
  diagnosis: Diagnosis | null;
  mdtMeetings?: MdtMeeting[];
  surgeries: Surgery[];
  followUps: FollowUpVisit[];
};

const MS_PER_DAY = 86_400_000;
const FOLLOW_UP_INTERVAL_DAYS = 90;

export function computeWorkflowStatus(patient: PatientWorkflowInput): WorkflowStatus {
  if (!patient.diagnosis?.cancerType) return "DRAFT";
  if (!hasPreTheatreMdt(patient.diagnosis, patient.mdtMeetings)) return "MDT_PENDING";

  const upcomingSurgery = patient.surgeries.find(
    (s) => s.surgeryDate && new Date(s.surgeryDate) > new Date(),
  );
  if (upcomingSurgery) return "SURGERY_BOOKED";

  if (patient.referral?.treatmentStartDate) return "IN_TREATMENT";

  const lastFollowUp = patient.followUps
    .map((f) => f.visitDate)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  if (lastFollowUp) {
    const daysSince = (Date.now() - new Date(lastFollowUp).getTime()) / MS_PER_DAY;
    if (daysSince > FOLLOW_UP_INTERVAL_DAYS) return "FOLLOW_UP";
    return "SURVEILLANCE";
  }

  return "FOLLOW_UP";
}

export function isFollowUpOverdue(patient: PatientWorkflowInput): boolean {
  const lastFollowUp = patient.followUps
    .map((f) => f.visitDate)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  if (!lastFollowUp) {
    return Boolean(patient.referral?.treatmentStartDate);
  }

  const daysSince = (Date.now() - new Date(lastFollowUp).getTime()) / MS_PER_DAY;
  return daysSince > FOLLOW_UP_INTERVAL_DAYS;
}

export function patientInitials(firstName: string, surname: string): string {
  return `${firstName.charAt(0)}${surname.charAt(0)}`.toUpperCase();
}

export function formatRegistryDisplay(registryNumber: string): string {
  if (registryNumber.includes("-")) return registryNumber;
  const num = registryNumber.replace(/^GYN/i, "");
  return `GYN-${num.padStart(4, "0")}`;
}
