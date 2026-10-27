import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logPatientViewAction } from "@/app/actions";
import { PatientRegistryChart } from "@/components/registry/patient-chart";
import { TumourClinicalRecord } from "@/components/registry/tumour-record";
import { HistoryInstruments } from "@/components/registry/history-instruments";
import { updateDemographicsAction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Label, FormField, FormRow } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EDUCATION_LEVEL, MARITAL_STATUS, PROVINCES, REGISTRATION_SITES, RESIDENCE_TYPE, SEX_AT_BIRTH } from "@/lib/codes";
import { CodedSelect } from "@/components/registry/form-fields";
import { formatRegistryDisplay } from "@/lib/patient-workflow";
import { TUMOUR_INCLUDE } from "@/lib/clinical-queues";
import type { CustomModuleForPatient } from "@/components/registry/custom-module-patient-card";
import { deleteReferralEpisodeAction, savePatientOutcomeAction } from "@/app/history-actions";
import { ReferralEpisodeForm } from "@/components/registry/referral-episode-form";

export const dynamic = "force-dynamic";

export default async function PatientChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; notice?: string }>;
}) {
  const user = await requireSession();
  const { id } = await params;
  const query = await searchParams;

  // Front desk access ends at registration and demographics. Avoid loading
  // clinical records at all for that role.
  if (!hasPermission(user.role, "clinical:read")) {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) notFound();
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
          <p className="font-mono text-sm text-[#0C4F4E]">{formatRegistryDisplay(patient.registryNumber)}</p>
          <h1 className="text-xl font-semibold">{patient.surname}, {patient.firstName}</h1>
        </section>
        <section className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
          <h2 className="mb-4 font-semibold">Patient demographics</h2>
          <form action={updateDemographicsAction.bind(null, patient.id)} className="space-y-3">
            <FormRow>
              <FormField><Label htmlFor="hospitalNumber">Hospital number</Label><Input id="hospitalNumber" name="hospitalNumber" defaultValue={patient.hospitalNumber ?? ""} required /></FormField>
              <FormField><Label htmlFor="nationalId">National ID</Label><Input id="nationalId" name="nationalId" defaultValue={patient.nationalId ?? ""} /></FormField>
            </FormRow>
            <FormField><Label htmlFor="address">Residential address</Label><Input id="address" name="address" defaultValue={patient.address ?? ""} /></FormField>
            <FormRow>
              <FormField><Label htmlFor="firstName">First name(s)</Label><Input id="firstName" name="firstName" defaultValue={patient.firstName} required /></FormField>
              <FormField><Label htmlFor="surname">Surname</Label><Input id="surname" name="surname" defaultValue={patient.surname} required /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="dateOfBirth">Date of birth</Label><Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth.toISOString().slice(0, 10)} required /></FormField>
              <FormField><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" defaultValue={patient.phone ?? ""} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="province">Province code</Label><select id="province" name="province" defaultValue={patient.province ?? ""} className="h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm"><option value="">Select…</option>{PROVINCES.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}</select></FormField>
              <FormField><Label htmlFor="district">District</Label><Input id="district" name="district" defaultValue={patient.district ?? ""} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="country">Country</Label><Input id="country" name="country" defaultValue={patient.country ?? "Zimbabwe"} /></FormField>
              <FormField><Label htmlFor="phoneAlt">Alternative phone</Label><Input id="phoneAlt" name="phoneAlt" type="tel" defaultValue={patient.phoneAlt ?? ""} /></FormField>
            </FormRow>
            <FormRow>
              <CodedSelect id="sexAtBirth" name="sexAtBirth" label="Sex at birth" options={SEX_AT_BIRTH} defaultValue={patient.sexAtBirth} />
              <CodedSelect id="residenceType" name="residenceType" label="Residence type" options={RESIDENCE_TYPE} defaultValue={patient.residenceType} />
            </FormRow>
            <FormRow>
              <CodedSelect id="educationLevel" name="educationLevel" label="Education" options={EDUCATION_LEVEL} defaultValue={patient.educationLevel} />
              <CodedSelect id="maritalStatus" name="maritalStatus" label="Marital status" options={MARITAL_STATUS} defaultValue={patient.maritalStatus} />
            </FormRow>
            <FormField><Label htmlFor="occupation">Occupation</Label><Input id="occupation" name="occupation" defaultValue={patient.occupation ?? ""} /></FormField>
            <FormRow>
              <FormField><Label htmlFor="nextOfKin">Next of kin</Label><Input id="nextOfKin" name="nextOfKin" defaultValue={patient.nextOfKin ?? ""} /></FormField>
              <FormField><Label htmlFor="nokPhone">Next-of-kin phone</Label><Input id="nokPhone" name="nokPhone" defaultValue={patient.nokPhone ?? ""} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="registrationDate">Registration date</Label><Input id="registrationDate" name="registrationDate" type="date" defaultValue={patient.registrationDate?.toISOString().slice(0, 10) ?? ""} /></FormField>
              <CodedSelect id="registrationSite" name="registrationSite" label="Registering facility" options={REGISTRATION_SITES} defaultValue={patient.registrationSite} />
            </FormRow>
            <Button type="submit" size="sm">Save demographics</Button>
          </form>
          {query.error ? <p className="mt-3 text-sm text-red-700">{query.error}</p> : null}
        </section>
      </div>
    );
  }

  const chartInclude = {
    referral: true,
    diagnosis: true,
    mdtMeetings: { orderBy: { meetingDate: "desc" as const } },
    imaging: true,
    surgeries: { orderBy: { surgeryDate: "desc" as const } },
    histopathology: true,
    chemotherapies: { orderBy: { chemoStartDate: "desc" as const } },
    radiotherapy: true,
    complications: { orderBy: { complicationDate: "desc" as const } },
    followUps: { orderBy: { visitDate: "desc" as const } },
    recurrence: true,
    survival: true,
    research: true,
    customModuleData: true,
  };
  const patient = await prisma.patient
    .findUnique({
      where: { id },
      include: { ...chartInclude, gynHistory: true, medicalHistory: true, familyCancers: true, referralEpisodes: { orderBy: { createdAt: "desc" } }, patientOutcome: true },
    })
    .catch(async () => {
      const fallback = await prisma.patient.findUnique({ where: { id }, include: chartInclude });
      return fallback ? { ...fallback, gynHistory: null, medicalHistory: null, familyCancers: [], referralEpisodes: [], patientOutcome: null } : null;
    });

  if (!patient) notFound();
  if (!hasPermission(user.role, "patients:read")) {
    redirect("/dashboard?error=access-denied");
  }

  const customModulesRaw = await prisma.customModule.findMany({
    where: { active: true },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const customModules: CustomModuleForPatient[] = customModulesRaw.map((mod) => ({
    id: mod.id,
    name: mod.name,
    description: mod.description,
    helperText: mod.helperText,
    slug: mod.slug,
    fields: mod.fields,
    patientData: patient.customModuleData.find((d) => d.moduleId === mod.id) ?? null,
  }));

  const tumours = prisma.tumour
    ? await prisma.tumour
        .findMany({
          where: { patientId: patient.id },
          include: { ...TUMOUR_INCLUDE, presenting: { include: { symptomEntries: true } }, mdtPreparations: true },
          orderBy: { sequencePrimary: "asc" },
        })
        .catch(async () => {
          const rows = await prisma.tumour
            .findMany({
              where: { patientId: patient.id },
              include: {
                assessments: true,
                pathology: true,
                imaging: true,
                stagings: true,
                mdts: true,
                surgeries: true,
                systemicTherapies: true,
                radiotherapies: true,
                recurrences: true,
                outcomes: true,
                labs: true,
                mdtPreparations: true,
              },
              orderBy: { sequencePrimary: "asc" },
            })
            .catch(() => []);
          return rows.map((t) => ({
            ...t,
            presenting: null,
            riskFactor: null,
            treatmentPlans: [],
            complications: [],
          }));
        })
    : [];

  await logPatientViewAction(patient.id);

  const canWriteClinical = hasPermission(user.role, "clinical:write");
  const canEditPatient = hasPermission(user.role, "patients:edit");

  return (
    <div className="space-y-6">
      <TumourClinicalRecord
        patientId={patient.id}
        registryNumber={patient.registryNumber}
        firstName={patient.firstName}
        surname={patient.surname}
        hospitalNumber={patient.hospitalNumber}
        referralDate={patient.referral?.referralDate ?? null}
        firstReview={patient.referral?.dateSeenAtCancerCenter ?? null}
        tumours={tumours}
        followUps={patient.followUps}
        canWrite={canWriteClinical}
      />
      <HistoryInstruments
        patientId={patient.id}
        gyn={patient.gynHistory}
        medical={patient.medicalHistory}
        family={patient.familyCancers}
        canWrite={canWriteClinical}
      />
      <section id="referral-episodes" className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <h2 className="mb-3 font-semibold">Referral episodes</h2>
        <div className="mb-4 space-y-2 text-sm">
          {patient.referralEpisodes.map((r) => (
            <details key={r.id} className="rounded border p-3">
              <summary className="cursor-pointer font-medium">{r.referralDate?.toLocaleDateString("en-GB") ?? "Undated"} · {r.referralFacility || r.referralSource || "Referral"} · {r.referralUrgency || "routine"}</summary>
              {canWriteClinical ? <div className="mt-3 space-y-3"><ReferralEpisodeForm patientId={patient.id} episode={r} /><form action={deleteReferralEpisodeAction.bind(null, patient.id, r.id)}><Button type="submit" variant="secondary" size="sm">Delete referral episode</Button></form></div> : null}
            </details>
          ))}
        </div>
        {canWriteClinical ? <ReferralEpisodeForm patientId={patient.id} /> : null}
      </section>
      <section id="patient-outcome" className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <h2 className="mb-3 font-semibold">Patient outcome</h2>
        {canWriteClinical ? <form action={savePatientOutcomeAction.bind(null, patient.id)} className="grid gap-2 sm:grid-cols-3">
          <FormField><Label>Last contact</Label><Input name="lastContactDate" type="date" defaultValue={patient.patientOutcome?.lastContactDate?.toISOString().slice(0, 10) ?? ""} /></FormField>
          <FormField><Label>Vital status</Label><Input name="vitalStatus" defaultValue={patient.patientOutcome?.vitalStatus ?? ""} /></FormField>
          <FormField><Label>Death date</Label><Input name="deathDate" type="date" defaultValue={patient.patientOutcome?.deathDate?.toISOString().slice(0, 10) ?? ""} /></FormField>
          <FormField><Label>Cause of death</Label><Input name="causeOfDeath" defaultValue={patient.patientOutcome?.causeOfDeath ?? ""} /></FormField>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cancerRelatedDeath" defaultChecked={patient.patientOutcome?.cancerRelatedDeath} />Cancer-related death</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lostToFollowUp" defaultChecked={patient.patientOutcome?.lostToFollowUp} />Lost to follow-up</label>
          <FormField><Label>Lost date</Label><Input name="lostFollowUpDate" type="date" defaultValue={patient.patientOutcome?.lostFollowUpDate?.toISOString().slice(0, 10) ?? ""} /></FormField>
          <div className="sm:col-span-3"><Button type="submit" size="sm">Save outcome</Button></div>
        </form> : <p className="text-sm">{patient.patientOutcome?.vitalStatus || "No outcome recorded"}</p>}
      </section>
      <PatientRegistryChart
        patient={patient}
        customModules={customModules}
        canWrite={false}
        canWriteResearch={canWriteClinical}
        canEditDemographics={canEditPatient}
        canDelete={hasPermission(user.role, "patients:delete")}
        savedModule={query.saved}
        errorMessage={query.error}
        notice={query.notice}
      />
    </div>
  );
}
