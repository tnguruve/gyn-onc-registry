"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSession,
  generateRegistryNumber,
  hashPassword,
  parseUserRole,
  requirePermission,
  requireSession,
  verifyCredentials,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { boolFromForm, codeFromForm } from "@/lib/codes";
import { serializeCharlsonConditions } from "@/lib/comorbidities";
import { calcBmi } from "@/lib/esgo-metrics";
import { normalizeNationalId, findPatientByNationalId } from "@/lib/patient-identity";
import { formatRegistryDisplay } from "@/lib/patient-workflow";
import { loginSchema } from "@/lib/validators";
import { USER_ROLES } from "@/lib/types";
import { z } from "zod";
import { computeWorkflowStatus } from "@/lib/patient-workflow";
import { buildInviteUrl, generateInviteToken, inviteExpiry } from "@/lib/invites";
import { MDT_INITIAL_TYPE } from "@/lib/mdt";
import { slugifyModuleName, type CustomModuleDraft } from "@/lib/custom-modules";
import { nextTumourCode, refreshTumourReadiness } from "@/lib/tumour-readiness";
import { hasPermission } from "@/lib/permissions";
import {
  syncDiagnosisToTumour,
  syncFirstImaging,
  syncFirstMdt,
  syncFirstPathology,
  syncFirstRadiotherapy,
  syncFirstSurgery,
  syncFirstSystemic,
} from "@/lib/legacy-tumour-sync";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export type AuthFormState = { error: string } | null;

const DB_ERROR_MSG =
  "Database unavailable. Wake Neon (SQL Editor → SELECT 1), then restart the app.";

function authErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Can't reach database")) {
      return "Database asleep. Run SELECT 1 in Neon SQL Editor, then in Terminal: npm run restart:local";
    }
    return error.message;
  }
  return DB_ERROR_MSG;
}

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

function patientPath(id: string) {
  return `/patients/${id}`;
}

function isRegistryNumberConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).includes("registryNumber")
  );
}

async function refreshRegistryViews(patientId?: string) {
  if (patientId) {
    const full = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { referral: true, diagnosis: true, mdtMeetings: true, surgeries: true, followUps: true },
    });
    if (full) {
      await prisma.patient.update({
        where: { id: patientId },
        data: { workflowStatus: computeWorkflowStatus(full) },
      });
    }
  }
  revalidatePath("/dashboard");
  revalidatePath("/patients");
}

function demographicsFromForm(formData: FormData, dob: Date, includeClinical = false) {
  const heightCm = parseFloatField(formData.get("heightCm"));
  const weightKg = parseFloatField(formData.get("weightKg"));
  const charlson = formData.getAll("charlson").map(String);
  const nationalId = normalizeNationalId(formData.get("nationalId"));
  return {
    hospitalNumber: String(formData.get("hospitalNumber") ?? "").trim() || undefined,
    nationalId,
    nationalIdNormalized: nationalId,
    firstName: String(formData.get("firstName") ?? "").trim(),
    surname: String(formData.get("surname") ?? "").trim(),
    dateOfBirth: dob,
    address: String(formData.get("address") ?? "").trim() || undefined,
    province: codeFromForm(formData.get("province")),
    district: String(formData.get("district") ?? "").trim() || undefined,
    maritalStatus: codeFromForm(formData.get("maritalStatus")),
    educationLevel: codeFromForm(formData.get("educationLevel")),
    occupation: String(formData.get("occupation") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    sexAtBirth: codeFromForm(formData.get("sexAtBirth")),
    phoneAlt: String(formData.get("phoneAlt") ?? "").trim() || undefined,
    residenceType: codeFromForm(formData.get("residenceType")),
    nextOfKin: String(formData.get("nextOfKin") ?? "").trim() || undefined,
    nokPhone: String(formData.get("nokPhone") ?? "").trim() || undefined,
    registrationDate: parseDate(formData.get("registrationDate")) ?? new Date(),
    registrationSite: String(formData.get("registrationSite") ?? "").trim() || "Parirenyatwa",
    country: String(formData.get("country") ?? "").trim() || "Zimbabwe",
    ...(includeClinical
      ? {
          hivStatus: codeFromForm(formData.get("hivStatus")),
          artStatus: codeFromForm(formData.get("artStatus")),
          artRegimen: String(formData.get("artRegimen") ?? "").trim() || undefined,
          cd4Count: parseIntField(formData.get("cd4Count")),
          viralLoad: String(formData.get("viralLoad") ?? "").trim() || undefined,
          ecog: codeFromForm(formData.get("ecog")),
          heightCm,
          weightKg,
          bmi: calcBmi(heightCm, weightKg) ?? parseFloatField(formData.get("bmi")),
          charlsonConditions: charlson.length ? serializeCharlsonConditions(charlson) : undefined,
        }
      : {}),
  };
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Please enter a valid email and password" };

  try {
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) return { error: "Invalid email or password" };

    const role = parseUserRole(user.role);
    if (!role) {
      return { error: "This account has an invalid role. Run /setup or contact your administrator." };
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    });
    await logAudit({ userId: user.id, userEmail: user.email, action: "LOGIN", entityType: "User", entityId: user.id });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("loginAction failed:", error);
    return { error: authErrorMessage(error) };
  }

  redirect("/dashboard");
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  void formData;
  return { error: "New accounts are not available. Use your registry login." };
}

export async function createPatientAction(formData: FormData) {
  const session = await requirePermission("patients:create");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const dob = parseDate(formData.get("dateOfBirth"));
  const hospitalNumber = String(formData.get("hospitalNumber") ?? "").trim();
  if (!firstName || !surname || !dob) redirectWithError("/patients/new", "First name, surname and date of birth are required");
  if (!hospitalNumber) redirectWithError("/patients/new", "Hospital number is required");

  const nationalId = normalizeNationalId(formData.get("nationalId"));
  if (nationalId) {
    const existing = await findPatientByNationalId(nationalId);
    if (existing) {
      redirect(`${patientPath(existing.id)}?notice=existing-national-id`);
    }
  }

  const registryNumber = await generateRegistryNumber();
  let patient;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 ? registryNumber : await generateRegistryNumber();
    try {
      patient = await prisma.patient.create({
        data: {
          registryNumber: candidate,
          ...demographicsFromForm(formData, dob),
        },
      });
      break;
    } catch (error) {
      if (isRegistryNumberConflict(error) && attempt < 4) continue;
      if (isRegistryNumberConflict(error)) {
        redirectWithError("/patients/new", "Could not assign a registry number. Please try again.");
      }
      throw error;
    }
  }
  if (!patient) redirectWithError("/patients/new", "Could not create patient. Please try again.");
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "Patient", entityId: patient.id, details: patient.registryNumber });
  await refreshRegistryViews(patient.id);
  redirect(patientPath(patient.id));
}

export async function updateDemographicsAction(patientId: string, formData: FormData) {
  const session = await requirePermission("patients:edit");
  const dob = parseDate(formData.get("dateOfBirth"));
  if (!dob) redirectWithError(patientPath(patientId), "Date of birth is required");

  const data = demographicsFromForm(
    formData,
    dob,
    hasPermission(session.role, "clinical:write"),
  );
  if (data.nationalId) {
    const existing = await findPatientByNationalId(data.nationalId, patientId);
    if (existing) {
      redirectWithError(
        patientPath(patientId),
        `National ID already registered under ${formatRegistryDisplay(existing.registryNumber)} (${existing.firstName} ${existing.surname}).`,
      );
    }
  }

  await prisma.patient.update({
    where: { id: patientId },
    data,
  });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Patient", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=demographics`);
}

export async function saveReferralAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    symptomStartDate: parseDate(formData.get("symptomStartDate")),
    firstHealthFacilityVisit: parseDate(formData.get("firstHealthFacilityVisit")),
    referralDate: parseDate(formData.get("referralDate")),
    dateSeenAtCancerCenter: parseDate(formData.get("dateSeenAtCancerCenter")),
    diagnosisDate: parseDate(formData.get("diagnosisDate")),
    treatmentStartDate: parseDate(formData.get("treatmentStartDate")),
    referralSource: codeFromForm(formData.get("referralSource")),
    referralReceived: parseDate(formData.get("referralReceived")),
    pathwaySource: codeFromForm(formData.get("pathwaySource")),
    referralFacility: String(formData.get("referralFacility") ?? "").trim() || undefined,
    referralLevel: String(formData.get("referralLevel") ?? "").trim() || undefined,
    referralReason: String(formData.get("referralReason") ?? "").trim() || undefined,
    suspectedCa: codeFromForm(formData.get("suspectedCa")),
    referralUrgency: String(formData.get("referralUrgency") ?? "").trim() || undefined,
    firstContactDate: parseDate(formData.get("firstContactDate")),
    previousFacilities: parseIntField(formData.get("previousFacilities")),
    referralNotes: String(formData.get("referralNotes") ?? "").trim() || undefined,
  };
  await prisma.referral.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Referral", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=referral#referral`);
}

export async function saveDiagnosisAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    cancerType: codeFromForm(formData.get("cancerType")),
    histology: codeFromForm(formData.get("histology")),
    grade: codeFromForm(formData.get("grade")),
    figoStage: codeFromForm(formData.get("figoStage")),
    tnmStage: String(formData.get("tnmStage") ?? "").trim() || undefined,
  };
  const figoVersion = String(formData.get("figoVersion") ?? "").trim() || undefined;
  await prisma.diagnosis.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await syncDiagnosisToTumour(patientId, { ...data, figoVersion });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Diagnosis", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=diagnosis#diagnosis`);
}

export async function addMdtMeetingAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const meetingDate = parseDate(formData.get("meetingDate"));
  if (!meetingDate) redirectWithError(patientPath(patientId), "MDT date is required");

  const meetingType = codeFromForm(formData.get("meetingType"));
  if (!meetingType) redirectWithError(patientPath(patientId), "MDT type is required");

  const summary = String(formData.get("summary") ?? "").trim() || undefined;
  await prisma.mdtMeeting.create({
    data: {
      patientId,
      meetingDate,
      meetingType,
      summary,
    },
  });
  await syncFirstMdt(patientId, meetingDate, summary);

  if (meetingType === MDT_INITIAL_TYPE) {
    await prisma.diagnosis.upsert({
      where: { patientId },
      create: { patientId, mdtDiscussed: true, mdtDate: meetingDate },
      update: { mdtDiscussed: true, mdtDate: meetingDate },
    });
  }

  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "MdtMeeting", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=mdt#mdt`);
}

export async function deleteMdtMeetingAction(patientId: string, meetingId: string) {
  const session = await requirePermission("clinical:write");
  const meeting = await prisma.mdtMeeting.findFirst({ where: { id: meetingId, patientId } });
  if (!meeting) redirectWithError(patientPath(patientId), "MDT meeting not found");

  await prisma.mdtMeeting.delete({ where: { id: meetingId } });

  if (meeting.meetingType === MDT_INITIAL_TYPE) {
    const stillHasInitial = await prisma.mdtMeeting.count({
      where: { patientId, meetingType: MDT_INITIAL_TYPE },
    });
    if (stillHasInitial === 0) {
      await prisma.diagnosis.updateMany({
        where: { patientId },
        data: { mdtDiscussed: false, mdtDate: null },
      });
    }
  }

  await logAudit({ userId: session.id, userEmail: session.email, action: "DELETE", entityType: "MdtMeeting", entityId: meetingId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#mdt`);
}

export async function saveImagingAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    ultrasoundDone: boolFromForm(formData.get("ultrasoundDone")),
    ctDone: boolFromForm(formData.get("ctDone")),
    mriDone: boolFromForm(formData.get("mriDone")),
    petDone: boolFromForm(formData.get("petDone")),
    tumorSizeMm: parseFloatField(formData.get("tumorSizeMm")),
    lymphNodesPresent: boolFromForm(formData.get("lymphNodesPresent")),
    ascites: boolFromForm(formData.get("ascites")),
    pleuralEffusion: boolFromForm(formData.get("pleuralEffusion")),
    pciScore: parseIntField(formData.get("pciScore")),
  };
  await prisma.imaging.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await syncFirstImaging(patientId, data);
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Imaging", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=imaging#imaging`);
}

export async function addSurgeryAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const surgeryDate = parseDate(formData.get("surgeryDate"));
  if (!surgeryDate) redirectWithError(patientPath(patientId), "Surgery date is required");
  const procedure = String(formData.get("procedure") ?? "").trim() || undefined;
  const residualDisease = String(formData.get("residualDisease") ?? "").trim() || undefined;
  await prisma.surgery.create({
    data: {
      patientId,
      surgeryDate,
      surgeon: String(formData.get("surgeon") ?? "").trim() || undefined,
      assistant: String(formData.get("assistant") ?? "").trim() || undefined,
      procedure,
      approach: codeFromForm(formData.get("approach")),
      operativeTimeMinutes: parseIntField(formData.get("operativeTimeMinutes")),
      bloodLossMl: parseIntField(formData.get("bloodLossMl")),
      transfusion: boolFromForm(formData.get("transfusion")),
      bowelResection: boolFromForm(formData.get("bowelResection")),
      bladderResection: boolFromForm(formData.get("bladderResection")),
      uretericSurgery: boolFromForm(formData.get("uretericSurgery")),
      stoma: boolFromForm(formData.get("stoma")),
      icuAdmission: boolFromForm(formData.get("icuAdmission")),
      intraoperativeComplication: String(formData.get("intraoperativeComplication") ?? "").trim() || undefined,
      residualDisease,
      ccScore: codeFromForm(formData.get("ccScore")),
    },
  });
  await syncFirstSurgery(patientId, { surgeryDate, procedure, residualDisease });
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "Surgery", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#surgery`);
}

export async function saveHistopathologyAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    pathologyDate: parseDate(formData.get("pathologyDate")),
    histology: codeFromForm(formData.get("histology")),
    grade: codeFromForm(formData.get("grade")),
    tumorSizeMm: parseFloatField(formData.get("tumorSizeMm")),
    depthInvasion: String(formData.get("depthInvasion") ?? "").trim() || undefined,
    myometrialInvasion: String(formData.get("myometrialInvasion") ?? "").trim() || undefined,
    lvsi: boolFromForm(formData.get("lvsi")),
    marginStatus: codeFromForm(formData.get("marginStatus")),
    nodesRemoved: parseIntField(formData.get("nodesRemoved")),
    positiveNodes: parseIntField(formData.get("positiveNodes")),
    washings: String(formData.get("washings") ?? "").trim() || undefined,
    omentum: String(formData.get("omentum") ?? "").trim() || undefined,
    p53: codeFromForm(formData.get("p53")),
    mmr: codeFromForm(formData.get("mmr")),
    pole: codeFromForm(formData.get("pole")),
    er: codeFromForm(formData.get("er")),
    pr: codeFromForm(formData.get("pr")),
    brca: codeFromForm(formData.get("brca")),
    hrd: codeFromForm(formData.get("hrd")),
    ca125: parseFloatField(formData.get("ca125")),
    he4: parseFloatField(formData.get("he4")),
    markerDate: parseDate(formData.get("markerDate")),
    betaHcg: parseFloatField(formData.get("betaHcg")),
    afp: parseFloatField(formData.get("afp")),
    cea: parseFloatField(formData.get("cea")),
    ldh: parseFloatField(formData.get("ldh")),
    markerNotes: String(formData.get("markerNotes") ?? "").trim() || undefined,
    p16: codeFromForm(formData.get("p16")),
    ki67: codeFromForm(formData.get("ki67")),
    ck7: codeFromForm(formData.get("ck7")),
    ck20: codeFromForm(formData.get("ck20")),
    ihcNotes: String(formData.get("ihcNotes") ?? "").trim() || undefined,
  };
  await prisma.histopathology.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await syncFirstPathology(patientId, {
    pathologyDate: data.pathologyDate,
    histology: data.histology,
    grade: data.grade,
    lvsi: data.lvsi,
    nodesRemoved: data.nodesRemoved,
    positiveNodes: data.positiveNodes,
  });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Histopathology", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=histopathology#histopathology`);
}

export async function addChemotherapyAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const chemoStartDate = parseDate(formData.get("chemoStartDate"));
  const regimen = codeFromForm(formData.get("regimen"));
  await prisma.chemotherapy.create({
    data: {
      patientId,
      chemoStartDate,
      regimen,
      cyclesPlanned: parseIntField(formData.get("cyclesPlanned")),
      cyclesReceived: parseIntField(formData.get("cyclesReceived")),
      doseReduction: boolFromForm(formData.get("doseReduction")),
      toxicityGrade: codeFromForm(formData.get("toxicityGrade")),
      stoppedEarly: boolFromForm(formData.get("stoppedEarly")),
    },
  });
  await syncFirstSystemic(patientId, { chemoStartDate, regimen });
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "Chemotherapy", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#chemotherapy`);
}

export async function saveRadiotherapyAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    ebrtGiven: boolFromForm(formData.get("ebrtGiven")),
    ebrtStart: parseDate(formData.get("ebrtStart")),
    ebrtEnd: parseDate(formData.get("ebrtEnd")),
    doseGy: parseFloatField(formData.get("doseGy")),
    fractions: parseIntField(formData.get("fractions")),
    brachytherapyGiven: boolFromForm(formData.get("brachytherapyGiven")),
    brachytherapySessions: parseIntField(formData.get("brachytherapySessions")),
    interrupted: boolFromForm(formData.get("interrupted")),
  };
  await prisma.radiotherapy.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await syncFirstRadiotherapy(patientId, data);
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Radiotherapy", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#radiotherapy`);
}

export async function addComplicationAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  await prisma.complication.create({
    data: {
      patientId,
      complicationDate: parseDate(formData.get("complicationDate")),
      complicationType: String(formData.get("complicationType") ?? "").trim() || undefined,
      clavienDindoGrade: codeFromForm(formData.get("clavienDindoGrade")),
      readmission: boolFromForm(formData.get("readmission")),
      reoperation: boolFromForm(formData.get("reoperation")),
      icu: boolFromForm(formData.get("icu")),
      mortality30Day: boolFromForm(formData.get("mortality30Day")),
      mortality90Day: boolFromForm(formData.get("mortality90Day")),
    },
  });
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "Complication", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#complications`);
}

export async function addFollowUpAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const followUpId = String(formData.get("followUpId") ?? "").trim();
  const visitDate = parseDate(formData.get("visitDate"));
  if (!visitDate) redirectWithError(patientPath(patientId), "Follow-up date is required");
  const data = {
      patientId,
      visitDate,
      ecog: codeFromForm(formData.get("ecog")),
      diseaseStatus: codeFromForm(formData.get("diseaseStatus")),
      recurrence: boolFromForm(formData.get("recurrence")),
      symptoms: String(formData.get("symptoms") ?? "").trim() || undefined,
      treatmentGiven: String(formData.get("treatmentGiven") ?? "").trim() || undefined,
      nextAppointment: parseDate(formData.get("nextAppointment")),
      examFindings: String(formData.get("examFindings") ?? "").trim() || undefined,
      imagingDone: boolFromForm(formData.get("imagingDone")),
      tumourMarkers: String(formData.get("tumourMarkers") ?? "").trim() || undefined,
      lateToxicity: String(formData.get("lateToxicity") ?? "").trim() || undefined,
      recurrenceSuspected: boolFromForm(formData.get("recurrenceSuspected")),
    };
  if (followUpId) {
    const result = await prisma.followUpVisit.updateMany({ where: { id: followUpId, patientId }, data });
    if (!result.count) redirectWithError(patientPath(patientId), "Follow-up visit not found");
  } else {
    await prisma.followUpVisit.create({ data });
  }
  await logAudit({ userId: session.id, userEmail: session.email, action: followUpId ? "UPDATE" : "CREATE", entityType: "FollowUp", entityId: followUpId || patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#followup`);
}

export async function deleteFollowUpAction(patientId: string, followUpId: string) {
  const session = await requirePermission("clinical:write");
  const result = await prisma.followUpVisit.deleteMany({ where: { id: followUpId, patientId } });
  if (!result.count) redirectWithError(patientPath(patientId), "Follow-up visit not found");
  await logAudit({ userId: session.id, userEmail: session.email, action: "DELETE", entityType: "FollowUp", entityId: followUpId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#followup`);
}

export async function saveRecurrenceAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    recurrenceDate: parseDate(formData.get("recurrenceDate")),
    recurrenceSite: codeFromForm(formData.get("recurrenceSite")),
    biopsyConfirmed: boolFromForm(formData.get("biopsyConfirmed")),
    treatmentForRecurrence: String(formData.get("treatmentForRecurrence") ?? "").trim() || undefined,
  };
  await prisma.recurrence.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Recurrence", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#recurrence`);
}

export async function saveSurvivalAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    aliveStatus: codeFromForm(formData.get("aliveStatus")),
    dateLastSeen: parseDate(formData.get("dateLastSeen")),
    deathDate: parseDate(formData.get("deathDate")),
    causeOfDeath: String(formData.get("causeOfDeath") ?? "").trim() || undefined,
  };
  await prisma.survival.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Survival", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#survival`);
}

export async function saveResearchAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const data = {
    consentForResearch: boolFromForm(formData.get("consentForResearch")),
    consentForGenetics: boolFromForm(formData.get("consentForGenetics")),
    tissueBank: boolFromForm(formData.get("tissueBank")),
    bloodSamples: boolFromForm(formData.get("bloodSamples")),
    genomicTesting: boolFromForm(formData.get("genomicTesting")),
    qualityOfLifeScores: String(formData.get("qualityOfLifeScores") ?? "").trim() || undefined,
  };
  await prisma.researchModule.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Research", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#research`);
}

export async function createInviteAction(formData: FormData) {
  const session = await requirePermission("admin:users");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleParsed = z.enum(USER_ROLES).safeParse(String(formData.get("role") ?? "CLINICIAN"));
  const role = roleParsed.success ? roleParsed.data : "CLINICIAN";

  if (!name || !email) redirectWithError("/admin", "Name and email are required");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) redirectWithError("/admin", "A user with this email already exists");

  const pending = await prisma.invite.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pending) redirectWithError("/admin", "An active invite already exists for this email");

  const token = generateInviteToken();
  const invite = await prisma.invite.create({
    data: {
      name,
      email,
      role,
      token,
      expiresAt: inviteExpiry(7),
      createdById: session.id,
    },
  });

  const inviteUrl = buildInviteUrl(invite.token);
  await logAudit({
    userId: session.id,
    userEmail: session.email,
    action: "CREATE_INVITE",
    entityType: "Invite",
    entityId: invite.id,
    details: email,
  });
  revalidatePath("/admin");
  redirect(`/admin?invite=${encodeURIComponent(inviteUrl)}`);
}

export async function acceptInviteAction(token: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) redirectWithError(`/invite/${token}`, "Password must be at least 8 characters");
  if (password !== confirm) redirectWithError(`/invite/${token}`, "Passwords do not match");

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    redirect("/login?error=Invalid+or+expired+invitation");
  }

  const user = await prisma.user.create({
    data: {
      name: invite.name,
      email: invite.email,
      role: invite.role,
      passwordHash: await hashPassword(password),
      active: true,
    },
  });

  await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as import("@/lib/types").UserRole,
  });

  await logAudit({ userId: user.id, userEmail: user.email, action: "ACCEPT_INVITE", entityType: "User", entityId: user.id });
  redirect("/dashboard");
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  const session = await requirePermission("admin:users");
  if (userId === session.id && !active) redirectWithError("/admin", "You cannot disable your own account");
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await logAudit({ userId: session.id, userEmail: session.email, action: active ? "ENABLE_USER" : "DISABLE_USER", entityType: "User", entityId: userId });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deletePatientAction(patientId: string) {
  const session = await requirePermission("patients:delete");

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) redirectWithError("/patients", "Patient not found");

  await prisma.patient.delete({ where: { id: patientId } });

  await logAudit({
    userId: session.id,
    userEmail: session.email,
    action: "DELETE",
    entityType: "Patient",
    entityId: patientId,
    details: patient.registryNumber,
  });

  await refreshRegistryViews();
  redirect("/patients?deleted=1");
}

export async function logPatientViewAction(patientId: string) {
  const session = await requireSession();
  await logAudit({ userId: session.id, userEmail: session.email, action: "VIEW", entityType: "Patient", entityId: patientId });
}

export type CustomModulePayload = CustomModuleDraft;

export async function upsertCustomModuleAction(formData: FormData) {
  const session = await requirePermission("modules:manage");
  const raw = String(formData.get("payload") ?? "");
  let payload: CustomModulePayload;
  try {
    payload = JSON.parse(raw) as CustomModulePayload;
  } catch {
    redirectWithError("/builder", "Invalid module data");
  }

  const name = payload.name?.trim();
  if (!name) redirectWithError("/builder", "Module name is required");
  if (!payload.fields?.length) redirectWithError("/builder", "Add at least one field");

  for (const field of payload.fields) {
    if (!field.label?.trim()) redirectWithError("/builder", "Every field needs a label");
    if (field.fieldType === "dropdown" && (!field.options || field.options.filter(Boolean).length < 2)) {
      redirectWithError("/builder", `Dropdown "${field.label}" needs at least two options`);
    }
  }

  let slug = slugifyModuleName(name);
  if (payload.id) {
    const existing = await prisma.customModule.findUnique({ where: { id: payload.id } });
    if (!existing) redirectWithError("/builder", "Module not found");
    slug = existing.slug;
  } else {
    const taken = await prisma.customModule.findUnique({ where: { slug } });
    if (taken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const moduleData = {
    name,
    description: payload.description?.trim() || null,
    helperText: payload.helperText?.trim() || null,
    slug,
    isPermanent: payload.isPermanent !== false,
    active: true,
  };

  const savedModule = payload.id
    ? await prisma.customModule.update({ where: { id: payload.id }, data: moduleData })
    : await prisma.customModule.create({
        data: {
          ...moduleData,
          sortOrder: (await prisma.customModule.count()) + 1,
        },
      });

  await prisma.customModuleField.deleteMany({ where: { moduleId: savedModule.id } });
  await prisma.customModuleField.createMany({
    data: payload.fields.map((field, index) => ({
      moduleId: savedModule.id,
      label: field.label.trim(),
      fieldType: field.fieldType,
      required: field.required,
      options: field.fieldType === "dropdown" ? JSON.stringify(field.options.map((o) => o.trim()).filter(Boolean)) : null,
      sortOrder: index,
    })),
  });

  await logAudit({
    userId: session.id,
    userEmail: session.email,
    action: payload.id ? "UPDATE" : "CREATE",
    entityType: "CustomModule",
    entityId: savedModule.id,
    details: name,
  });

  revalidatePath("/builder");
  revalidatePath("/patients");
  redirect(`/builder?module=${module.id}&saved=1`);
}

export async function deleteCustomModuleAction(moduleId: string) {
  const session = await requirePermission("modules:manage");
  const mod = await prisma.customModule.findUnique({ where: { id: moduleId } });
  if (!mod) redirectWithError("/builder", "Module not found");

  await prisma.customModule.delete({ where: { id: moduleId } });
  await logAudit({
    userId: session.id,
    userEmail: session.email,
    action: "DELETE",
    entityType: "CustomModule",
    entityId: moduleId,
    details: mod.name,
  });
  revalidatePath("/builder");
  revalidatePath("/patients");
  redirect("/builder?deleted=1");
}

export async function savePatientCustomModuleAction(patientId: string, moduleId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const mod = await prisma.customModule.findUnique({
    where: { id: moduleId, active: true },
    include: { fields: true },
  });
  if (!mod) redirectWithError(patientPath(patientId), "Module not found");

  const values: Record<string, string> = {};
  for (const field of mod.fields) {
    const key = `field_${field.id}`;
    if (field.fieldType === "checkbox" || field.fieldType === "boolean") {
      values[field.id] = formData.get(key) === "on" ? "1" : "0";
    } else {
      values[field.id] = String(formData.get(key) ?? "").trim();
    }
    if (field.required && !values[field.id]) {
      redirectWithError(patientPath(patientId), `${field.label} is required`);
    }
  }

  await prisma.patientCustomModuleData.upsert({
    where: { patientId_moduleId: { patientId, moduleId } },
    create: { patientId, moduleId, values: JSON.stringify(values) },
    update: { values: JSON.stringify(values) },
  });

  await logAudit({
    userId: session.id,
    userEmail: session.email,
    action: "UPDATE",
    entityType: "PatientCustomModuleData",
    entityId: `${patientId}:${moduleId}`,
    details: mod.name,
  });

  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=custom-${mod.slug}#custom-${mod.slug}`);
}

export async function createTumourAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const site = codeFromForm(formData.get("site"));
  if (!site) redirectWithError(patientPath(patientId), "Primary site is required");
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) redirectWithError("/patients", "Patient not found");
  const tumourCode = await nextTumourCode(patientId, patient.registryNumber);
  const sequencePrimary = (await prisma.tumour.count({ where: { patientId } })) + 1;
  const tumour = await prisma.tumour.create({
    data: {
      patientId,
      tumourCode,
      sequencePrimary,
      site,
      histology: String(formData.get("histology") ?? "").trim() || undefined,
      incidenceDate: parseDate(formData.get("incidenceDate")),
      diagnosisDate: parseDate(formData.get("diagnosisDate")),
      hivStatus: codeFromForm(formData.get("hivStatus")) ?? patient.hivStatus ?? undefined,
      laterality: String(formData.get("laterality") ?? "").trim() || undefined,
      icdoTopography: String(formData.get("icdoTopography") ?? "").trim() || undefined,
      icdoMorphology: String(formData.get("icdoMorphology") ?? "").trim() || undefined,
      icdoBehaviour: String(formData.get("icdoBehaviour") ?? "").trim() || undefined,
      tumourGrade: String(formData.get("tumourGrade") ?? "").trim() || undefined,
      basisDiagnosis: String(formData.get("basisDiagnosis") ?? "").trim() || undefined,
      figoVersion: String(formData.get("figoVersion") ?? "").trim() || undefined,
      figoStage: String(formData.get("figoStage") ?? "").trim() || undefined,
    },
  });
  await refreshTumourReadiness(tumour.id);
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "Tumour", entityId: tumour.id, details: tumourCode });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#tumour-${tumour.id}`);
}

export async function updateTumourAction(patientId: string, tumourId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const result = await prisma.tumour.updateMany({
    where: { id: tumourId, patientId },
    data: {
      site: codeFromForm(formData.get("site")),
      laterality: String(formData.get("laterality") ?? "").trim() || undefined,
      histology: String(formData.get("histology") ?? "").trim() || undefined,
      icdoTopography: String(formData.get("icdoTopography") ?? "").trim() || undefined,
      icdoMorphology: String(formData.get("icdoMorphology") ?? "").trim() || undefined,
      icdoBehaviour: String(formData.get("icdoBehaviour") ?? "").trim() || undefined,
      tumourGrade: String(formData.get("tumourGrade") ?? "").trim() || undefined,
      basisDiagnosis: String(formData.get("basisDiagnosis") ?? "").trim() || undefined,
      incidenceDate: parseDate(formData.get("incidenceDate")),
      diagnosisDate: parseDate(formData.get("diagnosisDate")),
      figoVersion: String(formData.get("figoVersion") ?? "").trim() || undefined,
      figoStage: String(formData.get("figoStage") ?? "").trim() || undefined,
      hivStatus: codeFromForm(formData.get("hivStatus")),
    },
  });
  if (!result.count) redirectWithError(patientPath(patientId), "Tumour not found for this patient");
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Tumour", entityId: tumourId });
  await refreshTumourReadiness(tumourId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#tumour-${tumourId}`);
}

export async function saveTumourEventAction(patientId: string, tumourId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const tumour = await prisma.tumour.findFirst({
    where: { id: tumourId, patientId },
    select: { id: true },
  });
  if (!tumour) redirectWithError(patientPath(patientId), "Tumour not found for this patient");
  const type = String(formData.get("type") ?? "");
  const eventId = String(formData.get("eventId") ?? "").trim();
  const check = (name: string) => formData.get(name) === "on" || formData.get(name) === "true";

  if (type === "assessment") {
    const data = {
        tumourId,
        assessmentDate: parseDate(formData.get("assessmentDate")) ?? new Date(),
        presentingComplaint: String(formData.get("presentingComplaint") ?? "").trim() || undefined,
        bleeding: String(formData.get("bleeding") ?? "").trim() || undefined,
        pain: String(formData.get("pain") ?? "").trim() || undefined,
        discharge: String(formData.get("discharge") ?? "").trim() || undefined,
        weightLoss: check("weightLoss"),
        ecog: String(formData.get("ecog") ?? "").trim() || undefined,
        tumourSizeCm: parseFloatField(formData.get("tumourSizeCm")),
        vaginalInvolvement: String(formData.get("vaginalInvolvement") ?? "").trim() || undefined,
        parametriumLeft: String(formData.get("parametriumLeft") ?? "").trim() || undefined,
        parametriumRight: String(formData.get("parametriumRight") ?? "").trim() || undefined,
        pelvicWall: check("pelvicWall"),
        bladderInvasion: check("bladderInvasion"),
        rectalInvasion: check("rectalInvasion"),
        notes: String(formData.get("notes") ?? "").trim() || undefined,
        examiner: String(formData.get("examiner") ?? "").trim() || undefined,
        heightCm: parseFloatField(formData.get("heightCm")),
        weightKg: parseFloatField(formData.get("weightKg")),
        pallor: check("pallor"),
        jaundice: check("jaundice"),
        cachexia: check("cachexia"),
        oedema: check("oedema"),
        ascites: check("ascites"),
        hepatomegaly: check("hepatomegaly"),
        contactBleeding: check("contactBleeding"),
        supraclavicularNodes: check("supraclavicularNodes"),
        inguinalNodes: check("inguinalNodes"),
        abdominalMass: check("abdominalMass"),
        abdominalMassSizeCm: parseFloatField(formData.get("abdominalMassSizeCm")),
        vulvalLesion: check("vulvalLesion"),
        vulvalSite: String(formData.get("vulvalSite") ?? "").trim() || undefined,
        vulvalSizeMm: parseFloatField(formData.get("vulvalSizeMm")),
        midlineInvolvement: check("midlineInvolvement"),
        cervixVisible: String(formData.get("cervixVisible") ?? "").trim() || undefined,
        cervicalLesion: check("cervicalLesion"),
        cervicalAppearance: String(formData.get("cervicalAppearance") ?? "").trim() || undefined,
        uterineSize: String(formData.get("uterineSize") ?? "").trim() || undefined,
        uterineMobility: String(formData.get("uterineMobility") ?? "").trim() || undefined,
        adnexalMass: check("adnexalMass"),
        pelvicMassSizeCm: parseFloatField(formData.get("pelvicMassSizeCm")),
        bmi: calcBmi(parseFloatField(formData.get("heightCm")), parseFloatField(formData.get("weightKg"))),
      };
    if (eventId) await prisma.clinicalAssessment.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.clinicalAssessment.create({ data });
  } else if (type === "pathology") {
    const data = {
        tumourId,
        specimenDate: parseDate(formData.get("specimenDate")),
        reportDate: parseDate(formData.get("reportDate")),
        specimenType: String(formData.get("specimenType") ?? "").trim() || undefined,
        histology: String(formData.get("histology") ?? "").trim() || undefined,
        grade: String(formData.get("grade") ?? "").trim() || undefined,
        lvsi: String(formData.get("lvsi") ?? "").trim() || undefined,
        nodesExamined: parseIntField(formData.get("nodesExamined")),
        nodesPositive: parseIntField(formData.get("nodesPositive")),
        icdoMorphology: String(formData.get("icdoMorphology") ?? "").trim() || undefined,
        tumourSize: String(formData.get("tumourSize") ?? "").trim() || undefined,
        depthInvasion: String(formData.get("depthInvasion") ?? "").trim() || undefined,
        perineural: String(formData.get("perineural") ?? "").trim() || undefined,
        marginStatus: String(formData.get("marginStatus") ?? "").trim() || undefined,
        closestMarginMm: parseFloatField(formData.get("closestMarginMm")),
        extracapsular: String(formData.get("extracapsular") ?? "").trim() || undefined,
        p16: String(formData.get("p16") ?? "").trim() || undefined,
        p53: String(formData.get("p53") ?? "").trim() || undefined,
        er: String(formData.get("er") ?? "").trim() || undefined,
        pr: String(formData.get("pr") ?? "").trim() || undefined,
        her2: String(formData.get("her2") ?? "").trim() || undefined,
        mmr: String(formData.get("mmr") ?? "").trim() || undefined,
        mlh1: String(formData.get("mlh1") ?? "").trim() || undefined,
        msh2: String(formData.get("msh2") ?? "").trim() || undefined,
        msh6: String(formData.get("msh6") ?? "").trim() || undefined,
        pms2: String(formData.get("pms2") ?? "").trim() || undefined,
        msi: String(formData.get("msi") ?? "").trim() || undefined,
        pole: String(formData.get("pole") ?? "").trim() || undefined,
        hpvAssociation: String(formData.get("hpvAssociation") ?? "").trim() || undefined,
        brca: String(formData.get("brca") ?? "").trim() || undefined,
        hrd: String(formData.get("hrd") ?? "").trim() || undefined,
        ki67: String(formData.get("ki67") ?? "").trim() || undefined,
        molecularNotes: String(formData.get("molecularNotes") ?? "").trim() || undefined,
        laboratory: String(formData.get("laboratory") ?? "").trim() || undefined,
        pathNumber: String(formData.get("pathNumber") ?? "").trim() || undefined,
        anatomicalSite: String(formData.get("anatomicalSite") ?? "").trim() || undefined,
        reportText: String(formData.get("reportText") ?? "").trim() || undefined,
      };
    if (eventId) await prisma.tumourPathology.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourPathology.create({ data });
  } else if (type === "imaging") {
    const data = {
        tumourId,
        imagingDate: parseDate(formData.get("imagingDate")),
        modality: String(formData.get("modality") ?? "").trim() || undefined,
        facility: String(formData.get("facility") ?? "").trim() || "Unknown",
        impression: String(formData.get("impression") ?? "").trim() || undefined,
        pelvicNodes: check("pelvicNodes"),
        paraaorticNodes: check("paraaorticNodes"),
        distantMetastasis: check("distantMetastasis"),
        indication: String(formData.get("indication") ?? "").trim() || undefined,
        tumourSeen: check("tumourSeen"),
        tumourSize: String(formData.get("tumourSize") ?? "").trim() || undefined,
        ascites: check("ascites"),
        liverMets: check("liverMets"),
        lungMets: check("lungMets"),
        boneMets: check("boneMets"),
        localExtension: String(formData.get("localExtension") ?? "").trim() || undefined,
        inguinalNodes: check("inguinalNodes"),
        peritonealDisease: check("peritonealDisease"),
        omentalDisease: check("omentalDisease"),
        otherMetastases: String(formData.get("otherMetastases") ?? "").trim() || undefined,
        reportUploaded: check("reportUploaded"),
        reportText: String(formData.get("reportText") ?? "").trim() || undefined,
      };
    if (eventId) await prisma.tumourImaging.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourImaging.create({ data });
  } else if (type === "staging") {
    const data = {
        tumourId,
        stagingDate: parseDate(formData.get("stagingDate")) ?? new Date(),
        system: String(formData.get("system") ?? "FIGO").trim() || "FIGO",
        version: String(formData.get("version") ?? "").trim() || undefined,
        stage: String(formData.get("stage") ?? "").trim() || undefined,
        substage: String(formData.get("substage") ?? "").trim() || undefined,
        basis: String(formData.get("basis") ?? "").trim() || undefined,
        clinicalStage: String(formData.get("clinicalStage") ?? "").trim() || undefined,
        pathologicalStage: String(formData.get("pathologicalStage") ?? "").trim() || undefined,
        finalStage: String(formData.get("finalStage") ?? "").trim() || undefined,
        tumourSizeCm: parseFloatField(formData.get("tumourSizeCm")),
        vaginalInvolvement: String(formData.get("vaginalInvolvement") ?? "").trim() || undefined,
        parametrium: check("parametrium"),
        pelvicWall: check("pelvicWall"),
        hydronephrosis: check("hydronephrosis"),
        bladderInvasion: check("bladderInvasion"),
        rectalInvasion: check("rectalInvasion"),
        pelvicNodes: check("pelvicNodes"),
        paraaorticNodes: check("paraaorticNodes"),
        distantMetastasis: check("distantMetastasis"),
        parametriumLeft: String(formData.get("parametriumLeft") ?? "").trim() || undefined,
        parametriumRight: String(formData.get("parametriumRight") ?? "").trim() || undefined,
      };
    if (eventId) await prisma.tumourStaging.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourStaging.create({ data });
  } else if (type === "mdt") {
    const implementedRaw = String(formData.get("implemented") ?? "");
    const data = {
        tumourId,
        requestDate: parseDate(formData.get("requestDate")),
        meetingDate: parseDate(formData.get("meetingDate")),
        status: String(formData.get("status") ?? "").trim() || undefined,
        intent: String(formData.get("intent") ?? "").trim() || undefined,
        recommendation: String(formData.get("recommendation") ?? "").trim() || undefined,
        implemented: implementedRaw === "true" ? true : implementedRaw === "false" ? false : undefined,
        implementationDate: parseDate(formData.get("implementationDate")),
        reasonNotImplemented: String(formData.get("reasonNotImplemented") ?? "").trim() || undefined,
        indication: String(formData.get("indication") ?? "").trim() || undefined,
        presentingClinician: String(formData.get("presentingClinician") ?? "").trim() || undefined,
        question: String(formData.get("question") ?? "").trim() || undefined,
        stageAtMdt: String(formData.get("stageAtMdt") ?? "").trim() || undefined,
        performanceStatus: String(formData.get("performanceStatus") ?? "").trim() || undefined,
        responsibleClinician: String(formData.get("responsibleClinician") ?? "").trim() || undefined,
        targetTreatmentDate: parseDate(formData.get("targetTreatmentDate")),
        notes: String(formData.get("notes") ?? "").trim() || undefined,
        decision: String(formData.get("decision") ?? "").trim() || undefined,
        recommendedSurgery: check("recommendedSurgery"),
        recommendedSystemic: check("recommendedSystemic"),
        recommendedRadiotherapy: check("recommendedRadiotherapy"),
        recommendedInvestigation: check("recommendedInvestigation"),
        recommendedPalliation: check("recommendedPalliation"),
      };
    if (eventId) await prisma.tumourMdt.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourMdt.create({ data });
  } else if (type === "surgery") {
    const data = {
        tumourId,
        surgeryDate: parseDate(formData.get("surgeryDate")),
        procedure: String(formData.get("procedure") ?? "").trim() || undefined,
        intent: String(formData.get("intent") ?? "").trim() || undefined,
        residualDisease: String(formData.get("residualDisease") ?? "").trim() || undefined,
        complication: String(formData.get("complication") ?? "").trim() || undefined,
        lengthOfStay: parseIntField(formData.get("lengthOfStay")),
        surgeon: String(formData.get("surgeon") ?? "").trim() || undefined,
        approach: String(formData.get("approach") ?? "").trim() || undefined,
        bloodLossMl: parseIntField(formData.get("bloodLossMl")),
        transfusion: check("transfusion"),
        clavienDindo: String(formData.get("clavienDindo") ?? "").trim() || undefined,
        icu: check("icu"),
        readmission30d: check("readmission30d"),
        mortality30d: check("mortality30d"),
        mortality90d: check("mortality90d"),
        assistant: String(formData.get("assistant") ?? "").trim() || undefined,
        anaesthesia: String(formData.get("anaesthesia") ?? "").trim() || undefined,
        operativeFindings: String(formData.get("operativeFindings") ?? "").trim() || undefined,
        diseaseDistribution: String(formData.get("diseaseDistribution") ?? "").trim() || undefined,
        surgicalComplexity: String(formData.get("surgicalComplexity") ?? "").trim() || undefined,
        ascites: check("ascites"),
        peritonealDisease: check("peritonealDisease"),
        nodesProcedure: String(formData.get("nodesProcedure") ?? "").trim() || undefined,
        procedureCompleted: check("procedureCompleted"),
        intraopComplication: String(formData.get("intraopComplication") ?? "").trim() || undefined,
        postopComplication: String(formData.get("postopComplication") ?? "").trim() || undefined,
        dischargeDate: parseDate(formData.get("dischargeDate")),
        ccScore: String(formData.get("ccScore") ?? "").trim() || undefined,
      };
    if (eventId) await prisma.tumourSurgery.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourSurgery.create({ data });
  } else if (type === "systemic") {
    const data = {
        tumourId,
        therapyDate: parseDate(formData.get("therapyDate")),
        regimen: String(formData.get("regimen") ?? "").trim() || undefined,
        cycleNumber: parseIntField(formData.get("cycleNumber")),
        intent: String(formData.get("intent") ?? "").trim() || undefined,
        response: String(formData.get("response") ?? "").trim() || undefined,
        completed: check("completed"),
        therapyType: String(formData.get("therapyType") ?? "").trim() || undefined,
        drug: String(formData.get("drug") ?? "").trim() || undefined,
        dose: String(formData.get("dose") ?? "").trim() || undefined,
        doseReduction: check("doseReduction"),
        adverseEvent: String(formData.get("adverseEvent") ?? "").trim() || undefined,
        ctcaeGrade: String(formData.get("ctcaeGrade") ?? "").trim() || undefined,
        reasonStopped: String(formData.get("reasonStopped") ?? "").trim() || undefined,
        doseUnit: String(formData.get("doseUnit") ?? "").trim() || undefined,
        reasonReduction: String(formData.get("reasonReduction") ?? "").trim() || undefined,
        cycleCompleted: check("cycleCompleted"),
      };
    if (eventId) await prisma.tumourSystemic.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourSystemic.create({ data });
  } else if (type === "radiotherapy") {
    const data = {
        tumourId,
        startDate: parseDate(formData.get("startDate")),
        endDate: parseDate(formData.get("endDate")),
        intent: String(formData.get("intent") ?? "").trim() || undefined,
        ebrtDose: String(formData.get("ebrtDose") ?? "").trim() || undefined,
        brachytherapy: check("brachytherapy"),
        completed: check("completed"),
        indication: String(formData.get("indication") ?? "").trim() || undefined,
        ebrtFractions: String(formData.get("ebrtFractions") ?? "").trim() || undefined,
        brachyDose: String(formData.get("brachyDose") ?? "").trim() || undefined,
        interrupted: check("interrupted"),
        interruptionDays: parseIntField(formData.get("interruptionDays")),
        interruptionReason: String(formData.get("interruptionReason") ?? "").trim() || undefined,
        toxicity: String(formData.get("toxicity") ?? "").trim() || undefined,
        ebrt: check("ebrt"),
        brachyFractions: String(formData.get("brachyFractions") ?? "").trim() || undefined,
      };
    if (eventId) await prisma.tumourRadiotherapy.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourRadiotherapy.create({ data });
  } else if (type === "recurrence") {
    const data = {
        tumourId,
        recurrenceDate: parseDate(formData.get("recurrenceDate")),
        type: String(formData.get("recurrenceType") ?? "").trim() || undefined,
        site: String(formData.get("site") ?? "").trim() || undefined,
        confirmationMethod: String(formData.get("confirmationMethod") ?? "").trim() || undefined,
        treatment: String(formData.get("treatment") ?? "").trim() || undefined,
        local: check("local"),
        regional: check("regional"),
        distant: check("distant"),
        treatmentRecommended: String(formData.get("treatmentRecommended") ?? "").trim() || undefined,
        treatmentGiven: String(formData.get("treatmentGiven") ?? "").trim() || undefined,
      };
    if (eventId) await prisma.tumourRecurrence.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourRecurrence.create({ data });
  } else if (type === "outcome") {
    const data = {
        tumourId,
        statusDate: parseDate(formData.get("statusDate")) ?? new Date(),
        vitalStatus: String(formData.get("vitalStatus") ?? "").trim() || undefined,
        diseaseStatus: String(formData.get("diseaseStatus") ?? "").trim() || undefined,
        lastContactDate: parseDate(formData.get("lastContactDate")),
        deathDate: parseDate(formData.get("deathDate")),
        causeOfDeath: String(formData.get("causeOfDeath") ?? "").trim() || undefined,
        lostToFollowUp: check("lostToFollowUp"),
        lostFollowUpDate: parseDate(formData.get("lostFollowUpDate")),
        cancerRelatedDeath: check("cancerRelatedDeath"),
      };
    if (eventId) await prisma.tumourOutcome.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourOutcome.create({ data });
  } else if (type === "lab") {
    const data = {
        tumourId,
        labDate: parseDate(formData.get("labDate")),
        labTest: String(formData.get("labTest") ?? "").trim() || undefined,
        labValue: String(formData.get("labValue") ?? "").trim() || undefined,
        labUnit: String(formData.get("labUnit") ?? "").trim() || undefined,
        labCategory: String(formData.get("labCategory") ?? "").trim() || undefined,
        referenceLow: String(formData.get("referenceLow") ?? "").trim() || undefined,
        referenceHigh: String(formData.get("referenceHigh") ?? "").trim() || undefined,
        abnormalFlag: String(formData.get("abnormalFlag") ?? "").trim() || undefined,
        laboratory: String(formData.get("laboratory") ?? "").trim() || undefined,
      };
    if (eventId) await prisma.tumourLab.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourLab.create({ data });
  } else if (type === "treatmentPlan") {
    const data = {
      tumourId,
      planDate: parseDate(formData.get("planDate")) ?? new Date(),
      intent: String(formData.get("intent") ?? "").trim() || undefined,
      plannedSurgery: check("plannedSurgery"),
      plannedSystemic: check("plannedSystemic"),
      plannedRadiotherapy: check("plannedRadiotherapy"),
      plannedPalliative: check("plannedPalliative"),
      plannedInvestigation: check("plannedInvestigation"),
      mdtRecommendationId: String(formData.get("mdtRecommendationId") ?? "").trim() || undefined,
      treatmentSequence: String(formData.get("treatmentSequence") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    };
    if (eventId) await prisma.treatmentPlan.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.treatmentPlan.create({ data });
  } else if (type === "tumourComplication") {
    const data = {
      tumourId,
      complicationDate: parseDate(formData.get("complicationDate")),
      complicationType: String(formData.get("complicationType") ?? "").trim() || undefined,
      clavienDindo: String(formData.get("clavienDindo") ?? "").trim() || undefined,
      linkedProcedure: String(formData.get("linkedProcedure") ?? "").trim() || undefined,
      readmission: check("readmission"),
      reoperation: check("reoperation"),
      icu: check("icu"),
      mortality30Day: check("mortality30Day"),
      mortality90Day: check("mortality90Day"),
    };
    if (eventId) await prisma.tumourComplication.updateMany({ where: { id: eventId, tumourId }, data });
    else await prisma.tumourComplication.create({ data });
  } else {
    redirectWithError(patientPath(patientId), "Unknown clinical event");
  }

  await refreshTumourReadiness(tumourId);
  await logAudit({ userId: session.id, userEmail: session.email, action: eventId ? "UPDATE" : "CREATE", entityType: type, entityId: eventId || tumourId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#tumour-${tumourId}`);
}

export async function saveMdtPreparationAction(patientId: string, tumourId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const tumour = await prisma.tumour.findFirst({ where: { id: tumourId, patientId }, select: { id: true } });
  if (!tumour) redirectWithError(patientPath(patientId), "Tumour not found for this patient");
  const check = (name: string) => formData.get(name) === "on";
  const eventId = String(formData.get("eventId") ?? "").trim();
  const histologyRequired = check("histologyRequired");
  const imagingRequired = check("imagingRequired");
  const histologyAvailable = check("histologyAvailable");
  const imagingAvailable = check("imagingAvailable");
  const labsComplete = check("labsComplete");
  const clinicalSummaryComplete = check("clinicalSummaryComplete");
  const data = {
      tumourId,
      requestDate: parseDate(formData.get("requestDate")),
      indication: String(formData.get("indication") ?? "").trim() || undefined,
      histologyRequired,
      histologyAvailable,
      imagingRequired,
      imagingAvailable,
      labsComplete,
      clinicalSummaryComplete,
      ready: (!histologyRequired || histologyAvailable) && (!imagingRequired || imagingAvailable) && labsComplete && clinicalSummaryComplete,
      bookingDate: parseDate(formData.get("bookingDate")),
      scheduledDate: parseDate(formData.get("scheduledDate")),
      status: String(formData.get("status") ?? "").trim() || undefined,
      reasonNotReady: String(formData.get("reasonNotReady") ?? "").trim() || undefined,
    };
  if (eventId) {
    const result = await prisma.mdtPreparation.updateMany({ where: { id: eventId, tumourId }, data });
    if (!result.count) redirectWithError(patientPath(patientId), "MDT preparation not found");
  } else {
    await prisma.mdtPreparation.create({ data });
  }
  await logAudit({ userId: session.id, userEmail: session.email, action: eventId ? "UPDATE" : "CREATE", entityType: "MdtPreparation", entityId: eventId || tumourId });
  await refreshTumourReadiness(tumourId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#tumour-${tumourId}`);
}

export async function deleteMdtPreparationAction(patientId: string, tumourId: string, eventId: string) {
  const session = await requirePermission("clinical:write");
  const result = await prisma.mdtPreparation.deleteMany({ where: { id: eventId, tumourId, tumour: { patientId } } });
  if (!result.count) redirectWithError(patientPath(patientId), "MDT preparation not found");
  await logAudit({ userId: session.id, userEmail: session.email, action: "DELETE", entityType: "MdtPreparation", entityId: eventId });
  await refreshTumourReadiness(tumourId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#tumour-${tumourId}`);
}

export async function deleteTumourEventAction(patientId: string, tumourId: string, type: string, eventId: string) {
  const session = await requirePermission("clinical:write");
  const tumour = await prisma.tumour.findFirst({ where: { id: tumourId, patientId }, select: { id: true } });
  if (!tumour) redirectWithError(patientPath(patientId), "Tumour not found for this patient");
  const where = { id: eventId, tumourId };
  const deleted =
    type === "assessment" ? await prisma.clinicalAssessment.deleteMany({ where }) :
    type === "pathology" ? await prisma.tumourPathology.deleteMany({ where }) :
    type === "imaging" ? await prisma.tumourImaging.deleteMany({ where }) :
    type === "staging" ? await prisma.tumourStaging.deleteMany({ where }) :
    type === "mdt" ? await prisma.tumourMdt.deleteMany({ where }) :
    type === "surgery" ? await prisma.tumourSurgery.deleteMany({ where }) :
    type === "systemic" ? await prisma.tumourSystemic.deleteMany({ where }) :
    type === "radiotherapy" ? await prisma.tumourRadiotherapy.deleteMany({ where }) :
    type === "recurrence" ? await prisma.tumourRecurrence.deleteMany({ where }) :
    type === "outcome" ? await prisma.tumourOutcome.deleteMany({ where }) :
    type === "lab" ? await prisma.tumourLab.deleteMany({ where }) :
    type === "treatmentPlan" ? await prisma.treatmentPlan.deleteMany({ where }) :
    type === "tumourComplication" ? await prisma.tumourComplication.deleteMany({ where }) : null;
  if (!deleted?.count) redirectWithError(patientPath(patientId), "Clinical record not found");
  await logAudit({ userId: session.id, userEmail: session.email, action: "DELETE", entityType: type, entityId: eventId });
  await refreshTumourReadiness(tumourId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#tumour-${tumourId}`);
}
