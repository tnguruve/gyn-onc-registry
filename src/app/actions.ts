"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSession,
  generateRegistryNumber,
  hashPassword,
  requirePermission,
  requireSession,
  verifyCredentials,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { boolFromForm, codeFromForm } from "@/lib/codes";
import { serializeCharlsonConditions } from "@/lib/comorbidities";
import { calcBmi } from "@/lib/esgo-metrics";
import { loginSchema } from "@/lib/validators";
import { computeWorkflowStatus } from "@/lib/patient-workflow";
import { buildInviteUrl, generateInviteToken, inviteExpiry } from "@/lib/invites";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
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

async function refreshRegistryViews(patientId?: string) {
  if (patientId) {
    const full = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { referral: true, diagnosis: true, surgeries: true, followUps: true },
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

function demographicsFromForm(formData: FormData, dob: Date) {
  const heightCm = parseFloatField(formData.get("heightCm"));
  const weightKg = parseFloatField(formData.get("weightKg"));
  const charlson = formData.getAll("charlson").map(String);
  return {
    hospitalNumber: String(formData.get("hospitalNumber") ?? "").trim() || undefined,
    nationalId: String(formData.get("nationalId") ?? "").trim() || undefined,
    firstName: String(formData.get("firstName") ?? "").trim(),
    surname: String(formData.get("surname") ?? "").trim(),
    dateOfBirth: dob,
    province: codeFromForm(formData.get("province")),
    district: String(formData.get("district") ?? "").trim() || undefined,
    maritalStatus: codeFromForm(formData.get("maritalStatus")),
    educationLevel: codeFromForm(formData.get("educationLevel")),
    occupation: String(formData.get("occupation") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
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
  };
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=Please+enter+a+valid+email+and+password");

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) redirect("/login?error=Invalid+email+or+password");

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as import("@/lib/types").UserRole,
  });
  await logAudit({ userId: user.id, userEmail: user.email, action: "LOGIN", entityType: "User", entityId: user.id });
  redirect("/dashboard");
}

export async function createPatientAction(formData: FormData) {
  const session = await requirePermission("patients:create");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const dob = parseDate(formData.get("dateOfBirth"));
  if (!firstName || !surname || !dob) redirectWithError("/patients/new", "First name, surname and date of birth are required");

  const registryNumber = await generateRegistryNumber();
  const patient = await prisma.patient.create({
    data: {
      registryNumber,
      ...demographicsFromForm(formData, dob),
    },
  });

  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "Patient", entityId: patient.id, details: registryNumber });
  await refreshRegistryViews(patient.id);
  redirect(patientPath(patient.id));
}

export async function updateDemographicsAction(patientId: string, formData: FormData) {
  const session = await requirePermission("patients:edit");
  const dob = parseDate(formData.get("dateOfBirth"));
  if (!dob) redirectWithError(patientPath(patientId), "Date of birth is required");

  await prisma.patient.update({
    where: { id: patientId },
    data: demographicsFromForm(formData, dob),
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
    mdtDiscussed: boolFromForm(formData.get("mdtDiscussed")),
    mdtDate: parseDate(formData.get("mdtDate")),
  };
  await prisma.diagnosis.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Diagnosis", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=diagnosis#diagnosis`);
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
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Imaging", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}?saved=imaging#imaging`);
}

export async function addSurgeryAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  const surgeryDate = parseDate(formData.get("surgeryDate"));
  if (!surgeryDate) redirectWithError(patientPath(patientId), "Surgery date is required");
  await prisma.surgery.create({
    data: {
      patientId,
      surgeryDate,
      surgeon: String(formData.get("surgeon") ?? "").trim() || undefined,
      assistant: String(formData.get("assistant") ?? "").trim() || undefined,
      procedure: String(formData.get("procedure") ?? "").trim() || undefined,
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
      residualDisease: String(formData.get("residualDisease") ?? "").trim() || undefined,
      ccScore: codeFromForm(formData.get("ccScore")),
    },
  });
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
  };
  await prisma.histopathology.upsert({ where: { patientId }, create: { patientId, ...data }, update: data });
  await logAudit({ userId: session.id, userEmail: session.email, action: "UPDATE", entityType: "Histopathology", entityId: patientId });
  await refreshRegistryViews(patientId);
  revalidatePath(patientPath(patientId));
  redirect(`${patientPath(patientId)}#histopathology`);
}

export async function addChemotherapyAction(patientId: string, formData: FormData) {
  const session = await requirePermission("clinical:write");
  await prisma.chemotherapy.create({
    data: {
      patientId,
      chemoStartDate: parseDate(formData.get("chemoStartDate")),
      regimen: codeFromForm(formData.get("regimen")),
      cyclesPlanned: parseIntField(formData.get("cyclesPlanned")),
      cyclesReceived: parseIntField(formData.get("cyclesReceived")),
      doseReduction: boolFromForm(formData.get("doseReduction")),
      toxicityGrade: codeFromForm(formData.get("toxicityGrade")),
      stoppedEarly: boolFromForm(formData.get("stoppedEarly")),
    },
  });
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
  const visitDate = parseDate(formData.get("visitDate"));
  if (!visitDate) redirectWithError(patientPath(patientId), "Follow-up date is required");
  await prisma.followUpVisit.create({
    data: {
      patientId,
      visitDate,
      ecog: codeFromForm(formData.get("ecog")),
      diseaseStatus: codeFromForm(formData.get("diseaseStatus")),
      recurrence: boolFromForm(formData.get("recurrence")),
      symptoms: String(formData.get("symptoms") ?? "").trim() || undefined,
      treatmentGiven: String(formData.get("treatmentGiven") ?? "").trim() || undefined,
    },
  });
  await logAudit({ userId: session.id, userEmail: session.email, action: "CREATE", entityType: "FollowUp", entityId: patientId });
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
  const role = String(formData.get("role") ?? "CLINICIAN");

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
