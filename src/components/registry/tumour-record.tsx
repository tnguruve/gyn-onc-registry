"use client";

import { useState } from "react";
import { createTumourAction, deleteFollowUpAction, deleteMdtPreparationAction, deleteTumourEventAction, saveMdtPreparationAction, saveTumourEventAction, updateTumourAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/field";
import { BASIS_DIAGNOSIS, FOLLOWUP_DISEASE_STATUS, HIV_STATUS, MDT_INTENT, MDT_RECOMMENDATION, MDT_STATUS, PRIMARY_SITE, labelFor } from "@/lib/codes";
import { formatRegistryDisplay } from "@/lib/patient-workflow";
import type { Tumour, ClinicalAssessment, TumourPathology, TumourImaging, TumourStaging, TumourMdt, MdtPreparation, TumourSurgery, TumourSystemic, TumourRadiotherapy, TumourRecurrence, TumourOutcome, TumourLab, FollowUpVisit, PresentingHistory, PresentingSymptom, RiskFactor, TreatmentPlan, TumourComplication } from "@prisma/client";
import { addTreatmentPlanAction, addTumourComplicationAction, savePresentingHistoryAction, saveRiskFactorAction } from "@/app/history-actions";
import { YNU } from "@/lib/codes";
import { addFollowUpAction } from "@/app/actions";

export type TumourBundle = Tumour & {
  assessments: ClinicalAssessment[];
  pathology: TumourPathology[];
  imaging: TumourImaging[];
  stagings: TumourStaging[];
  mdts: TumourMdt[];
  mdtPreparations: MdtPreparation[];
  surgeries: TumourSurgery[];
  systemicTherapies: TumourSystemic[];
  radiotherapies: TumourRadiotherapy[];
  recurrences: TumourRecurrence[];
  outcomes: TumourOutcome[];
  labs: TumourLab[];
  presenting: (PresentingHistory & { symptomEntries: PresentingSymptom[] }) | null;
  riskFactor: RiskFactor | null;
  treatmentPlans: TreatmentPlan[];
  complications: TumourComplication[];
};

function fmt(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC" });
}

export function TumourClinicalRecord({
  patientId,
  registryNumber,
  firstName,
  surname,
  hospitalNumber,
  referralDate,
  firstReview,
  tumours,
  followUps,
  canWrite,
}: {
  patientId: string;
  registryNumber: string;
  firstName: string;
  surname: string;
  hospitalNumber?: string | null;
  referralDate?: Date | null;
  firstReview?: Date | null;
  tumours: TumourBundle[];
  followUps: FollowUpVisit[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <p className="font-mono text-sm text-[#0C4F4E]">{formatRegistryDisplay(registryNumber)}</p>
        <h2 className="text-xl font-semibold">{surname}, {firstName}</h2>
        <p className="mt-1 text-sm text-[#5C6B66]">
          Hospital #{hospitalNumber || "—"} · Referral {fmt(referralDate)} · First review {fmt(firstReview)} · {(tumours ?? []).length} tumour{(tumours ?? []).length === 1 ? "" : "s"} · {(followUps ?? []).length} follow-up{(followUps ?? []).length === 1 ? "" : "s"}
        </p>
      </section>
      <section className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Follow-up</h2>
          <span className="text-xs text-[#7C8983]">{followUps.length} visit{followUps.length === 1 ? "" : "s"}</span>
        </div>
        {canWrite ? (
          <form action={addFollowUpAction.bind(null, patientId)} className="mb-4 grid gap-2 sm:grid-cols-5">
            <FormField>
              <Label htmlFor="visitDate">Visit date</Label>
              <Input id="visitDate" name="visitDate" type="date" required />
            </FormField>
            <FormField>
              <Label htmlFor="nextAppointment">Next appointment</Label>
              <Input id="nextAppointment" name="nextAppointment" type="date" />
            </FormField>
            <FormField>
              <Label htmlFor="diseaseStatus">Disease status</Label>
              <select id="diseaseStatus" name="diseaseStatus" className="h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm">
                <option value="">Select…</option>
                {FOLLOWUP_DISEASE_STATUS.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </FormField>
            <FormField>
              <Label htmlFor="ecog">ECOG</Label>
              <Input id="ecog" name="ecog" />
            </FormField>
            <FormField>
              <Label htmlFor="examFindings">Exam findings</Label>
              <Input id="examFindings" name="examFindings" />
            </FormField>
            <FormField>
              <Label htmlFor="followupSymptoms">Symptoms</Label>
              <Input id="followupSymptoms" name="symptoms" />
            </FormField>
            <FormField>
              <Label htmlFor="treatmentGiven">Treatment given</Label>
              <Input id="treatmentGiven" name="treatmentGiven" />
            </FormField>
            <FormField>
              <Label htmlFor="tumourMarkers">Tumour markers</Label>
              <Input id="tumourMarkers" name="tumourMarkers" />
            </FormField>
            <FormField>
              <Label htmlFor="lateToxicity">Late toxicity</Label>
              <Input id="lateToxicity" name="lateToxicity" />
            </FormField>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="imagingDone" /> Imaging done</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="recurrence" /> Recurrence confirmed</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="recurrenceSuspected" /> Recurrence suspected</label>
            <div className="flex items-end">
              <Button type="submit" size="sm">Save visit</Button>
            </div>
          </form>
        ) : null}
        <ul className="space-y-1 text-sm">
          {followUps.slice(0, 8).map((f) => (
            <li key={f.id} className="border-b border-[#F4F0E8] py-1.5">
              <details>
                <summary className="flex cursor-pointer justify-between"><span>{fmt(f.visitDate)} · {labelFor(FOLLOWUP_DISEASE_STATUS, f.diseaseStatus)}</span><span className="text-[#7C8983]">{f.nextAppointment ? `Next ${fmt(f.nextAppointment)}` : ""}</span></summary>
                {canWrite ? <FollowUpEditForm patientId={patientId} followUp={f} /> : null}
              </details>
            </li>
          ))}
          {followUps.length === 0 ? <li className="text-[#7C8983]">No follow-up visits yet.</li> : null}
        </ul>
      </section>

      {tumours.map((t) => (
        <TumourPanel key={t.id} patientId={patientId} tumour={t} canWrite={canWrite} />
      ))}

      {canWrite ? (
        <section className="rounded-2xl border border-dashed border-[#D5E4E2] bg-[#FBFAF6] p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Register tumour</h2>
          <form action={createTumourAction.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
            <FormField>
              <Label htmlFor="site">Primary site *</Label>
              <select id="site" name="site" required className="h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm">
                <option value="">Select…</option>
                {PRIMARY_SITE.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </FormField>
            <FormField>
              <Label htmlFor="histology">Histology summary</Label>
              <Input id="histology" name="histology" />
            </FormField>
            <FormField>
              <Label htmlFor="incidenceDate">Incidence date</Label>
              <Input id="incidenceDate" name="incidenceDate" type="date" />
            </FormField>
            <FormField>
              <Label htmlFor="diagnosisDate">Diagnosis date</Label>
              <Input id="diagnosisDate" name="diagnosisDate" type="date" />
            </FormField>
            <FormField>
              <Label htmlFor="hivStatus">HIV status</Label>
              <select id="hivStatus" name="hivStatus" className="h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm">
                <option value="">Select…</option>
                {HIV_STATUS.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </FormField>
            <FormField>
              <Label htmlFor="icdoTopography">ICD-O topography</Label>
              <Input id="icdoTopography" name="icdoTopography" placeholder="e.g. C53.9" />
            </FormField>
            <FormField>
              <Label htmlFor="icdoMorphology">ICD-O morphology</Label>
              <Input id="icdoMorphology" name="icdoMorphology" placeholder="e.g. 8070/3" />
            </FormField>
            <FormField>
              <Label htmlFor="icdoBehaviour">ICD-O behaviour</Label>
              <Input id="icdoBehaviour" name="icdoBehaviour" placeholder="e.g. 3" />
            </FormField>
            <FormField>
              <Label htmlFor="basisDiagnosis">Basis of diagnosis</Label>
              <select id="basisDiagnosis" name="basisDiagnosis" className="h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm">
                <option value="">Select…</option>
                {BASIS_DIAGNOSIS.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
            </FormField>
            <FormField>
              <Label htmlFor="laterality">Laterality</Label>
              <Input id="laterality" name="laterality" />
            </FormField>
            <FormField>
              <Label htmlFor="tumourGrade">Grade</Label>
              <Input id="tumourGrade" name="tumourGrade" />
            </FormField>
            <FormField><Label htmlFor="figoVersion">FIGO version</Label><Input id="figoVersion" name="figoVersion" /></FormField>
            <FormField><Label htmlFor="figoStage">FIGO stage</Label><Input id="figoStage" name="figoStage" /></FormField>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">Add tumour</Button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function FollowUpEditForm({ patientId, followUp }: { patientId: string; followUp: FollowUpVisit }) {
  return <form action={addFollowUpAction.bind(null, patientId)} className="mt-2 grid gap-2 rounded-xl bg-[#FBFAF6] p-3 sm:grid-cols-2">
    <input type="hidden" name="followUpId" value={followUp.id} />
    <DateField n="visitDate" l="Visit date" value={followUp.visitDate} />
    <DateField n="nextAppointment" l="Next appointment" value={followUp.nextAppointment} />
    <TextField n="ecog" l="ECOG" value={followUp.ecog} />
    <TextField n="diseaseStatus" l="Disease status" value={followUp.diseaseStatus} />
    <TextField n="symptoms" l="Symptoms" value={followUp.symptoms} />
    <TextField n="treatmentGiven" l="Treatment given" value={followUp.treatmentGiven} />
    <TextField n="examFindings" l="Exam findings" value={followUp.examFindings} />
    <TextField n="tumourMarkers" l="Tumour markers" value={followUp.tumourMarkers} />
    <TextField n="lateToxicity" l="Late toxicity" value={followUp.lateToxicity} />
    <div className="flex flex-wrap gap-3 sm:col-span-2">
      {[["recurrence", followUp.recurrence], ["imagingDone", followUp.imagingDone], ["recurrenceSuspected", followUp.recurrenceSuspected]].map(([name, checked]) => <label key={String(name)} className="flex items-center gap-1.5"><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} />{String(name).replaceAll(/([A-Z])/g, " $1")}</label>)}
    </div>
    <div className="flex gap-2 sm:col-span-2"><Button type="submit" size="sm">Save changes</Button><Button formAction={deleteFollowUpAction.bind(null, patientId, followUp.id)} type="submit" variant="secondary" size="sm">Delete visit</Button></div>
  </form>;
}

function TumourPanel({ patientId, tumour, canWrite }: { patientId: string; tumour: TumourBundle; canWrite: boolean }) {
  const ready = tumour.pathologyAvailable && tumour.imagingAvailable;
  return (
    <section id={`tumour-${tumour.id}`} className="scroll-mt-24 rounded-2xl border border-[#EAE5DA] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">{tumour.tumourCode} · {labelFor(PRIMARY_SITE, tumour.site)}</h2>
          <p className="text-sm text-[#5C6B66]">
            {tumour.histology || "Histology pending"} · {tumour.figoStage ? `FIGO ${tumour.figoStage}` : "Stage pending"}
            {tumour.figoVersion ? ` (${tumour.figoVersion})` : ""} · HIV: {labelFor(HIV_STATUS, tumour.hivStatus)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${ready ? "bg-[#E7F1EE] text-[#0C5C4E]" : "bg-[#FBEFD9] text-[#9A6B17]"}`}>
          {ready ? "MDT inputs ready" : "Work-up incomplete"}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className={tumour.pathologyAvailable ? "text-[#1F8A5B]" : "text-[#B23A48]"}>Histology {tumour.pathologyAvailable ? "✓" : "✕"}</span>
        <span className={tumour.imagingAvailable ? "text-[#1F8A5B]" : "text-[#B23A48]"}>Imaging {tumour.imagingAvailable ? "✓" : "✕"}</span>
        <span className="text-[#5C6B66]">{tumour.mdtStatus}</span>
      </div>
      {canWrite ? <TumourRegistrationForm patientId={patientId} tumour={tumour} /> : null}
      {canWrite ? <TumourHistory patientId={patientId} tumour={tumour} /> : null}
      {canWrite ? <MdtPreparationForm patientId={patientId} tumour={tumour} /> : null}
      {canWrite ? <EventDrawer patientId={patientId} tumourId={tumour.id} site={tumour.site} /> : null}
      <h3 className="mb-2 mt-4 text-[13px] font-semibold">Clinical timeline</h3>
      <div className="flex flex-col">
        {timeline(tumour).map((e) => (
          <div key={`${e.kind}-${e.id}`} className="grid gap-2 border-b border-[#F4F0E8] py-2 text-[13px] sm:grid-cols-[6.5rem_7rem_1fr]">
            <span className="text-[#7C8983]">{e.date}</span>
            <span className="font-semibold">{e.type}</span>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span>{e.text}</span>
                {canWrite ? <EventRowActions patientId={patientId} tumourId={tumour.id} event={e} /> : null}
              </div>
            </div>
          </div>
        ))}
        {timeline(tumour).length === 0 ? <p className="py-4 text-sm text-[#7C8983]">No longitudinal events yet.</p> : null}
      </div>
    </section>
  );
}

function TumourRegistrationForm({ patientId, tumour }: { patientId: string; tumour: TumourBundle }) {
  return <details className="mb-4 rounded-xl border border-[#EAE5DA] bg-[#FBFAF6] p-3">
    <summary className="cursor-pointer text-[13px] font-semibold">Edit tumour registration</summary>
    <form action={updateTumourAction.bind(null, patientId, tumour.id)} className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-[12px]">Primary site<select name="site" defaultValue={tumour.site} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm">{PRIMARY_SITE.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
      <TextField n="histology" l="Histology summary" value={tumour.histology} />
      <DateField n="incidenceDate" l="Incidence date" value={tumour.incidenceDate} />
      <DateField n="diagnosisDate" l="Diagnosis date" value={tumour.diagnosisDate} />
      <TextField n="laterality" l="Laterality" value={tumour.laterality} />
      <TextField n="icdoTopography" l="ICD-O topography" value={tumour.icdoTopography} />
      <TextField n="icdoMorphology" l="ICD-O morphology" value={tumour.icdoMorphology} />
      <TextField n="icdoBehaviour" l="ICD-O behaviour" value={tumour.icdoBehaviour} />
      <TextField n="tumourGrade" l="Tumour grade" value={tumour.tumourGrade} />
      <TextField n="basisDiagnosis" l="Basis of diagnosis" value={tumour.basisDiagnosis} />
      <TextField n="figoVersion" l="FIGO version" value={tumour.figoVersion} />
      <TextField n="figoStage" l="FIGO stage" value={tumour.figoStage} />
      <label className="text-[12px]">HIV status<select name="hivStatus" defaultValue={tumour.hivStatus ?? ""} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm"><option value="">Select…</option>{HIV_STATUS.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
      <div className="sm:col-span-2"><Button type="submit" size="sm">Save tumour registration</Button></div>
    </form>
  </details>;
}

const SYMPTOMS = [
  "postcoital bleeding", "postmenopausal bleeding", "intermenstrual bleeding", "heavy menstrual bleeding", "irregular bleeding", "contact bleeding",
  "vaginal discharge", "offensive discharge", "vulval pruritus", "vulval lesion", "vulval ulcer", "vulval mass",
  "pelvic pain", "abdominal pain", "back pain", "bone pain",
  "abdominal distension", "abdominal mass", "early satiety", "reduced appetite", "bloating",
  "weight loss", "fatigue", "leg swelling", "dyspnoea",
  "urinary frequency", "dysuria", "haematuria", "incontinence", "flank pain",
  "constipation", "diarrhoea", "rectal bleeding", "tenesmus",
];

function TumourHistory({ patientId, tumour }: { patientId: string; tumour: TumourBundle }) {
  let saved: Record<string, string> = {};
  try {
    saved = tumour.presenting?.symptoms ? (JSON.parse(tumour.presenting.symptoms) as Record<string, string>) : {};
  } catch {
    saved = {};
  }
  let durations: Record<string, string> = {};
  try { durations = tumour.presenting?.symptomDurations ? JSON.parse(tumour.presenting.symptomDurations) : {}; } catch { durations = {}; }
  const entryMap = Object.fromEntries((tumour.presenting?.symptomEntries ?? []).map((entry) => [entry.symptomCode, entry]));
  const [symptomStatus, setSymptomStatus] = useState(saved);
  return (
    <div className="mb-4 space-y-3 rounded-[12px] border border-[#EAE5DA] bg-[#FBFAF6] p-3">
      <form action={savePresentingHistoryAction.bind(null, patientId, tumour.id)} className="grid gap-2 sm:grid-cols-2">
        <p className="text-[13px] font-semibold sm:col-span-2">Presenting history</p>
        <label className="text-[12.5px]">Chief complaint<input name="chiefComplaint" defaultValue={tumour.presenting?.chiefComplaint ?? ""} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Symptom onset<input name="symptomOnsetDate" type="date" defaultValue={tumour.presenting?.symptomOnsetDate ? new Date(tumour.presenting.symptomOnsetDate).toISOString().slice(0, 10) : ""} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Duration (months)<input name="symptomDurationMonths" type="number" step="0.1" defaultValue={tumour.presenting?.symptomDurationMonths ?? ""} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
          {SYMPTOMS.map((s) => (
            <label key={s} className="text-[12px] capitalize">{s}
              <select name={`sx_${s}`} value={symptomStatus[s] ?? ""} onChange={(event) => setSymptomStatus((current) => ({ ...current, [s]: event.target.value }))} className="mt-1 h-9 w-full rounded-[8px] border border-[#E2DDD3] px-1 text-sm">
                <option value="">—</option>
                {YNU.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
              {symptomStatus[s] === "1" ? <><input name={`dur_${s}`} type="number" step="0.1" min="0" defaultValue={entryMap[s]?.durationMonths ?? durations[s] ?? ""} placeholder="Duration months" className="mt-1 h-9 w-full rounded-[8px] border border-[#E2DDD3] px-2 text-sm" /><input name={`note_${s}`} defaultValue={entryMap[s]?.notes ?? ""} placeholder="Notes" className="mt-1 h-9 w-full rounded-[8px] border border-[#E2DDD3] px-2 text-sm" /></> : null}
            </label>
          ))}
        </div>
        <Button type="submit" size="sm">Save presenting history</Button>
      </form>
      <form action={saveRiskFactorAction.bind(null, patientId, tumour.id)} className="grid gap-2 sm:grid-cols-2">
        <p className="text-[13px] font-semibold sm:col-span-2">Site-specific risk</p>
        {(tumour.site === "1" || tumour.site === "6" || tumour.site === "7" ? [["hpv", "HPV"]] :
          tumour.site === "2" || tumour.site === "9" || tumour.site === "10" ? [["hrt", "HRT"], ["tamoxifen", "Tamoxifen"]] :
          ["3", "4", "5"].includes(tumour.site) ? [["brca", "BRCA"]] :
          [["hpv", "HPV"], ["hrt", "HRT"], ["tamoxifen", "Tamoxifen"], ["brca", "BRCA"]]).map(([n, l]) => (
          <label key={n} className="text-[12.5px]">{l}
            <select name={n} defaultValue={(tumour.riskFactor?.[n as "hpv"] ?? "")} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm">
              <option value="">—</option>
              {YNU.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </label>
        ))}
        <TextField n="notes" l="Risk factor notes" />
        <Button type="submit" size="sm">Save risk factors</Button>
      </form>
      <form action={addTreatmentPlanAction.bind(null, patientId, tumour.id)} className="grid gap-2 sm:grid-cols-2">
        <p className="text-[13px] font-semibold sm:col-span-2">Treatment plan ({tumour.treatmentPlans.length} saved)</p>
        <label className="text-[12.5px]">Plan date<input name="planDate" type="date" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Intent<input name="intent" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Linked MDT recommendation ID<input name="mdtRecommendationId" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Treatment sequence<input name="treatmentSequence" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px] sm:col-span-2">Plan notes<input name="notes" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <div className="flex flex-wrap gap-3 text-[12.5px] sm:col-span-2">
          {["plannedSurgery", "plannedSystemic", "plannedRadiotherapy", "plannedPalliative", "plannedInvestigation"].map((n) => (
            <label key={n} className="flex items-center gap-1"><input type="checkbox" name={n} />{n.replace("planned", "")}</label>
          ))}
        </div>
        <Button type="submit" size="sm">Add treatment plan</Button>
      </form>
      <form action={addTumourComplicationAction.bind(null, patientId, tumour.id)} className="grid gap-2 sm:grid-cols-2">
        <p className="text-[13px] font-semibold sm:col-span-2">Complication ({tumour.complications.length} saved)</p>
        <label className="text-[12.5px]">Date<input name="complicationDate" type="date" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Type<input name="complicationType" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Clavien-Dindo<input name="clavienDindo" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <label className="text-[12.5px]">Linked procedure<input name="linkedProcedure" className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" /></label>
        <Checks names={["readmission", "reoperation", "icu", "mortality30Day", "mortality90Day"]} />
        <Button type="submit" size="sm">Add complication</Button>
      </form>
    </div>
  );
}

function MdtPreparationForm({ patientId, tumour }: { patientId: string; tumour: TumourBundle }) {
  return <div className="mb-4 space-y-2">
    {tumour.mdtPreparations.map((preparation) => <details key={preparation.id} className="rounded-[12px] border border-[#D5E4E2] bg-[#F4FAF8] p-3 text-sm">
      <summary className="cursor-pointer font-medium">{fmt(preparation.requestDate)} · {preparation.ready ? "Ready" : preparation.status || "Not ready"}</summary>
      <MdtPreparationEditor patientId={patientId} tumourId={tumour.id} preparation={preparation} />
    </details>)}
    <MdtPreparationEditor patientId={patientId} tumourId={tumour.id} />
  </div>;
}

function MdtPreparationEditor({ patientId, tumourId, preparation }: { patientId: string; tumourId: string; preparation?: MdtPreparation }) {
  return <form action={saveMdtPreparationAction.bind(null, patientId, tumourId)} className="mt-2 grid gap-2 rounded-[12px] border border-[#D5E4E2] bg-[#F4FAF8] p-3 sm:grid-cols-3">
    {preparation ? <input type="hidden" name="eventId" value={preparation.id} /> : null}
    <p className="font-semibold sm:col-span-3">{preparation ? "Edit MDT preparation" : "New MDT preparation"}</p>
    <DateField n="requestDate" l="Request date" value={preparation?.requestDate} />
    <DateField n="bookingDate" l="Booking date" value={preparation?.bookingDate} />
    <DateField n="scheduledDate" l="Scheduled date" value={preparation?.scheduledDate} />
    <TextField n="indication" l="Indication" value={preparation?.indication} />
    <TextField n="status" l="Status" value={preparation?.status} />
    <TextField n="reasonNotReady" l="Reason not ready" value={preparation?.reasonNotReady} />
    <div className="flex flex-wrap gap-3 text-[12.5px] sm:col-span-3">
      {["histologyRequired", "histologyAvailable", "imagingRequired", "imagingAvailable", "labsComplete", "clinicalSummaryComplete"].map((name) => <label key={name} className="flex items-center gap-1.5"><input type="checkbox" name={name} defaultChecked={preparation?.[name as keyof MdtPreparation] === true} />{name.replaceAll(/([A-Z])/g, " $1")}</label>)}
    </div>
    <div className="flex gap-2 sm:col-span-3"><Button type="submit" size="sm">{preparation ? "Save changes" : "Add MDT preparation"}</Button>{preparation ? <Button formAction={deleteMdtPreparationAction.bind(null, patientId, tumourId, preparation.id)} type="submit" variant="secondary" size="sm">Delete</Button> : null}</div>
  </form>;
}

type TimelineEvent = {
  id: string;
  kind: string;
  d: Date | null;
  date?: string;
  type: string;
  text: string;
  record: Record<string, unknown>;
};

function timeline(t: TumourBundle) {
  const a: TimelineEvent[] = [];
  for (const x of t.assessments) a.push({ id: x.id, kind: "assessment", d: x.assessmentDate, type: "Assessment", text: x.presentingComplaint || "Clinical assessment", record: { ...x } });
  for (const x of t.pathology) a.push({ id: x.id, kind: "pathology", d: x.reportDate || x.specimenDate, type: "Pathology", text: x.histology || x.specimenType || "Pathology", record: { ...x } });
  for (const x of t.imaging) a.push({ id: x.id, kind: "imaging", d: x.imagingDate, type: "Imaging", text: `${x.modality ?? ""}${x.impression ? " — " + x.impression : ""}`, record: { ...x } });
  for (const x of t.stagings) a.push({ id: x.id, kind: "staging", d: x.stagingDate, type: "Staging", text: `${x.system} ${x.stage ?? ""}${x.substage ?? ""}${x.version ? " · " + x.version : ""}`, record: { ...x } });
  for (const x of t.mdts) a.push({ id: x.id, kind: "mdt", d: x.meetingDate || x.requestDate, type: "MDT", text: x.decision || x.recommendation || x.status || "MDT", record: { ...x } });
  for (const x of t.surgeries) a.push({ id: x.id, kind: "surgery", d: x.surgeryDate, type: "Surgery", text: x.procedure || "Surgery", record: { ...x } });
  for (const x of t.systemicTherapies) a.push({ id: x.id, kind: "systemic", d: x.therapyDate, type: "Systemic", text: `${x.regimen ?? ""}${x.cycleNumber ? " cycle " + x.cycleNumber : ""}`, record: { ...x } });
  for (const x of t.radiotherapies) a.push({ id: x.id, kind: "radiotherapy", d: x.startDate, type: "Radiotherapy", text: x.ebrtDose || "Radiotherapy", record: { ...x } });
  for (const x of t.labs) a.push({ id: x.id, kind: "lab", d: x.labDate, type: "Lab", text: `${x.labTest ?? ""} ${x.labValue ?? ""} ${x.labUnit ?? ""}`.trim(), record: { ...x } });
  for (const x of t.recurrences) a.push({ id: x.id, kind: "recurrence", d: x.recurrenceDate, type: "Recurrence", text: x.site || x.type || "Recurrence", record: { ...x } });
  for (const x of t.treatmentPlans) a.push({ id: x.id, kind: "treatmentPlan", d: x.planDate, type: "Treatment plan", text: x.treatmentSequence || x.intent || "Treatment plan", record: { ...x } });
  for (const x of t.complications) a.push({ id: x.id, kind: "tumourComplication", d: x.complicationDate, type: "Complication", text: x.complicationType || "Complication", record: { ...x } });
  return a
    .sort((x, y) => +(y.d ?? 0) - +(x.d ?? 0))
    .map((x) => ({ ...x, date: fmt(x.d) }));
}

const EVENT_META_FIELDS = new Set(["id", "tumourId", "legacySourceId", "createdAt", "updatedAt"]);

function EventRowActions({ patientId, tumourId, event }: { patientId: string; tumourId: string; event: TimelineEvent }) {
  const [editing, setEditing] = useState(false);
  const action = saveTumourEventAction.bind(null, patientId, tumourId);
  const fields = Object.entries(event.record).filter(([name]) => !EVENT_META_FIELDS.has(name));
  return (
    <div className="shrink-0">
      <div className="flex gap-2">
        <button className="text-xs font-medium text-[#0C4F4E]" type="button" onClick={() => setEditing(!editing)}>Edit</button>
        <form action={deleteTumourEventAction.bind(null, patientId, tumourId, event.kind, event.id)}>
          <button className="text-xs text-red-700" type="submit">Delete</button>
        </form>
      </div>
      {editing ? (
        <form action={action} className="mt-3 grid min-w-[min(42rem,80vw)] gap-2 rounded-xl border border-[#D5E4E2] bg-[#FBFAF6] p-3 sm:grid-cols-2">
          <input type="hidden" name="type" value={event.kind} />
          <input type="hidden" name="eventId" value={event.id} />
          {fields.map(([name, value]) => {
            const inputName = event.kind === "recurrence" && name === "type" ? "recurrenceType" : name;
            const label = name.replaceAll(/([A-Z])/g, " $1");
            if (typeof value === "boolean") {
              return <label key={name} className="flex items-center gap-2 self-end py-2 capitalize"><input type="checkbox" name={inputName} defaultChecked={value} />{label}</label>;
            }
            const isDate = value instanceof Date || name.toLowerCase().endsWith("date");
            const isNumber = typeof value === "number";
            const defaultValue = value == null ? "" : isDate ? new Date(value as Date).toISOString().slice(0, 10) : String(value);
            return <label key={name} className="text-[12px] capitalize">{label}<input name={inputName} type={isDate ? "date" : isNumber ? "number" : "text"} step={isNumber ? "any" : undefined} defaultValue={defaultValue} className="mt-1 h-9 w-full rounded-lg border border-[#E2DDD3] px-2 text-sm" /></label>;
          })}
          <div className="flex gap-2 sm:col-span-2"><Button type="submit" size="sm">Save changes</Button><Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button></div>
        </form>
      ) : null}
    </div>
  );
}

function EventDrawer({ patientId, tumourId, site }: { patientId: string; tumourId: string; site: string }) {
  const [open, setOpen] = useState("");
  const action = saveTumourEventAction.bind(null, patientId, tumourId);
  const tabs = [
    ["assessment", "Assessment"],
    ["pathology", "Pathology"],
    ["imaging", "Imaging"],
    ["staging", "FIGO staging"],
    ["mdt", "MDT"],
    ["surgery", "Surgery"],
    ["systemic", "Systemic"],
    ["radiotherapy", "Radiotherapy"],
    ["lab", "Lab"],
    ["recurrence", "Recurrence"],
  ] as const;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setOpen(open === id ? "" : id)}
            className={`rounded-[10px] border px-3 py-1.5 text-[12.5px] ${open === id ? "border-[#0C4F4E] bg-[#0C4F4E] text-white" : "border-[#E2DDD3] bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {open ? (
        <form action={action} className="mt-3 grid gap-2 rounded-[12px] border border-[#EAE5DA] bg-[#FBFAF6] p-3 sm:grid-cols-2">
          <input type="hidden" name="type" value={open} />
          {open === "assessment" ? (
            <>
              <DateField n="assessmentDate" l="Date" />
              <TextField n="presentingComplaint" l="Presenting complaint" />
              <SelectField n="bleeding" l="Bleeding" o={["None", "Postcoital", "Postmenopausal", "Intermenstrual", "Other"]} />
              <TextField n="pain" l="Pain" />
              <TextField n="discharge" l="Discharge" />
              <NumField n="ecog" l="ECOG" />
              <NumField n="tumourSizeCm" l="Tumour size (cm)" step="0.1" />
              <SelectField n="vaginalInvolvement" l="Vaginal involvement" o={["None", "Upper third", "Lower third"]} />
              <TextField n="examiner" l="Examiner" />
              <NumField n="heightCm" l="Height (cm)" step="0.1" />
              <NumField n="weightKg" l="Weight (kg)" step="0.1" />
              <TextField n="vulvalSite" l="Vulval lesion site" />
              <NumField n="vulvalSizeMm" l="Vulval lesion size (mm)" step="0.1" />
              <TextField n="cervixVisible" l="Cervix visible" />
              <TextField n="cervicalAppearance" l="Cervical appearance" />
              <TextField n="uterineSize" l="Uterine size" />
              <TextField n="uterineMobility" l="Uterine mobility" />
              <TextField n="parametriumLeft" l="Left parametrium" />
              <TextField n="parametriumRight" l="Right parametrium" />
              <TextField n="notes" l="Examination notes" />
              <NumField n="abdominalMassSizeCm" l="Abdominal mass size (cm)" step="0.1" />
              <NumField n="pelvicMassSizeCm" l="Pelvic mass size (cm)" step="0.1" />
              <Checks names={["weightLoss", "pelvicWall", "bladderInvasion", "rectalInvasion", "pallor", "jaundice", "cachexia", "oedema", "ascites", "hepatomegaly", "contactBleeding", "supraclavicularNodes", "inguinalNodes", "abdominalMass", "vulvalLesion", "midlineInvolvement", "cervicalLesion", "adnexalMass"]} />
            </>
          ) : null}
          {open === "pathology" ? (
            <>
              <DateField n="specimenDate" l="Specimen date" />
              <DateField n="reportDate" l="Report date" />
              <TextField n="specimenType" l="Specimen type" />
              <TextField n="histology" l="Histology" />
              <TextField n="grade" l="Grade" />
              <SelectField n="lvsi" l="LVSI" o={["Absent", "Present", "Unknown"]} />
              <TextField n="laboratory" l="Laboratory" />
              <TextField n="pathNumber" l="Pathology number" />
              <TextField n="anatomicalSite" l="Anatomical site" />
              <TextField n="icdoMorphology" l="ICD-O morphology" />
              <TextField n="tumourSize" l="Tumour size" />
              <TextField n="depthInvasion" l="Depth of invasion" />
              <TextField n="perineural" l="Perineural invasion" />
              <TextField n="marginStatus" l="Margin status" />
              <NumField n="closestMarginMm" l="Closest margin (mm)" step="0.1" />
              <TextField n="extracapsular" l="Extracapsular extension" />
              <TextField n="p53" l="p53" />
              {["1", "6", "7"].includes(site) ? <><TextField n="p16" l="p16" /><TextField n="hpvAssociation" l="HPV association" /></> : null}
              {["2", "9", "10"].includes(site) ? <><TextField n="er" l="ER" /><TextField n="pr" l="PR" /><TextField n="her2" l="HER2" /><TextField n="mmr" l="MMR" /><TextField n="mlh1" l="MLH1" /><TextField n="msh2" l="MSH2" /><TextField n="msh6" l="MSH6" /><TextField n="pms2" l="PMS2" /><TextField n="msi" l="MSI" /><TextField n="pole" l="POLE" /></> : null}
              {["3", "4", "5"].includes(site) ? <><TextField n="brca" l="BRCA" /><TextField n="hrd" l="HRD" /></> : null}
              <TextField n="ki67" l="Ki-67" />
              <TextField n="molecularNotes" l="Molecular / IHC notes" />
              <TextField n="reportText" l="Report text" />
              <NumField n="nodesExamined" l="Nodes examined" />
              <NumField n="nodesPositive" l="Nodes positive" />
            </>
          ) : null}
          {open === "imaging" ? (
            <>
              <DateField n="imagingDate" l="Date" />
              <SelectField n="modality" l="Modality" o={["Ultrasound", "CT", "MRI", "PET-CT", "CXR", "Other"]} />
              <TextField n="facility" l="Facility" />
              <TextField n="indication" l="Indication" />
              <TextField n="impression" l="Impression" />
              <TextField n="tumourSize" l="Tumour size" />
              <TextField n="localExtension" l="Local extension" />
              <TextField n="otherMetastases" l="Other metastases" />
              <Checks names={["tumourSeen", "pelvicNodes", "paraaorticNodes", "distantMetastasis", "ascites", "liverMets", "lungMets", "boneMets", "inguinalNodes", "peritonealDisease", "omentalDisease", "reportUploaded"]} />
            </>
          ) : null}
          {open === "staging" ? (
            <>
              <DateField n="stagingDate" l="Date" />
              <SelectField n="system" l="Staging system" o={["FIGO", "TNM", "AJCC"]} />
              <TextField n="version" l="FIGO version e.g. 2018 / 2023" />
              <TextField n="clinicalStage" l="Clinical stage" />
              <TextField n="pathologicalStage" l="Pathological stage" />
              <TextField n="finalStage" l="Final stage" />
              <TextField n="stage" l="FIGO stage" />
              <TextField n="substage" l="Substage" />
              <TextField n="parametriumLeft" l="Left parametrium" />
              <TextField n="parametriumRight" l="Right parametrium" />
              <SelectField n="basis" l="Basis" o={["Clinical", "Imaging", "Pathological", "Combined"]} />
              <NumField n="tumourSizeCm" l="Size (cm)" step="0.1" />
              <Checks names={["parametrium", "pelvicWall", "hydronephrosis", "bladderInvasion", "rectalInvasion", "pelvicNodes", "paraaorticNodes", "distantMetastasis"]} />
            </>
          ) : null}
          {open === "mdt" ? (
            <>
              <DateField n="requestDate" l="Request date" />
              <DateField n="meetingDate" l="Meeting date" />
              <SelectField n="status" l="Status" o={MDT_STATUS.map((x) => x.code)} />
              <SelectField n="intent" l="Intent" o={MDT_INTENT.map((x) => x.code)} />
              <SelectField n="recommendation" l="Recommendation" o={MDT_RECOMMENDATION.map((x) => x.code)} />
              <SelectField n="implemented" l="Implemented?" o={["true", "false"]} />
              <DateField n="implementationDate" l="Implementation date" />
              <TextField n="reasonNotImplemented" l="Reason not implemented" />
              <TextField n="decision" l="Detailed MDT decision" />
              <TextField n="presentingClinician" l="Presenting clinician" />
              <TextField n="question" l="MDT question" />
              <TextField n="stageAtMdt" l="Stage at MDT" />
              <TextField n="responsibleClinician" l="Responsible clinician" />
              <DateField n="targetTreatmentDate" l="Target treatment date" />
              <TextField n="performanceStatus" l="Performance status" />
              <TextField n="notes" l="Discussion notes" />
              <Checks names={["recommendedSurgery", "recommendedSystemic", "recommendedRadiotherapy", "recommendedInvestigation", "recommendedPalliation"]} />
            </>
          ) : null}
          {open === "surgery" ? (
            <>
              <DateField n="surgeryDate" l="Date" />
              <TextField n="procedure" l="Procedure" />
              <TextField n="intent" l="Intent" />
              <TextField n="residualDisease" l="Residual disease" />
              <TextField n="complication" l="Complication" />
              <TextField n="surgeon" l="Surgeon" />
              <TextField n="assistant" l="Assistant" />
              <TextField n="anaesthesia" l="Anaesthesia" />
              <TextField n="approach" l="Approach" />
              <NumField n="bloodLossMl" l="Blood loss (ml)" />
              <TextField n="clavienDindo" l="Clavien-Dindo" />
              <NumField n="lengthOfStay" l="Length of stay (days)" />
              <DateField n="dischargeDate" l="Discharge date" />
              <TextField n="operativeFindings" l="Operative findings" />
              <TextField n="diseaseDistribution" l="Disease distribution" />
              <TextField n="surgicalComplexity" l="Surgical complexity" />
              <TextField n="nodesProcedure" l="Nodes procedure" />
              <TextField n="intraopComplication" l="Intraoperative complication" />
              <TextField n="postopComplication" l="Postoperative complication" />
              <TextField n="ccScore" l="CC score" />
              <Checks names={["transfusion", "icu", "readmission30d", "mortality30d", "mortality90d", "ascites", "peritonealDisease", "procedureCompleted"]} />
            </>
          ) : null}
          {open === "systemic" ? (
            <>
              <DateField n="therapyDate" l="Date" />
              <TextField n="regimen" l="Regimen" />
              <NumField n="cycleNumber" l="Cycle" />
              <TextField n="intent" l="Intent" />
              <TextField n="therapyType" l="Therapy type" />
              <TextField n="drug" l="Drug" />
              <TextField n="dose" l="Dose" />
              <TextField n="doseUnit" l="Dose unit" />
              <TextField n="response" l="Response" />
              <TextField n="adverseEvent" l="Adverse event" />
              <TextField n="ctcaeGrade" l="CTCAE grade" />
              <TextField n="reasonStopped" l="Reason stopped" />
              <TextField n="reasonReduction" l="Reason for reduction" />
              <Checks names={["completed", "doseReduction", "cycleCompleted"]} />
            </>
          ) : null}
          {open === "radiotherapy" ? (
            <>
              <DateField n="startDate" l="Start" />
              <DateField n="endDate" l="End" />
              <TextField n="intent" l="Intent" />
              <TextField n="indication" l="Indication" />
              <TextField n="ebrtDose" l="EBRT dose" />
              <TextField n="ebrtFractions" l="EBRT fractions" />
              <TextField n="brachyDose" l="Brachytherapy dose" />
              <TextField n="brachyFractions" l="Brachytherapy fractions" />
              <NumField n="interruptionDays" l="Interruption days" />
              <TextField n="interruptionReason" l="Interruption reason" />
              <TextField n="toxicity" l="Toxicity" />
              <Checks names={["ebrt", "brachytherapy", "completed", "interrupted"]} />
            </>
          ) : null}
          {open === "lab" ? (
            <>
              <DateField n="labDate" l="Date" />
              <TextField n="labTest" l="Test (e.g. CA-125)" />
              <TextField n="labValue" l="Value" />
              <TextField n="labUnit" l="Unit" />
              <TextField n="labCategory" l="Category" />
              <TextField n="referenceLow" l="Reference low" />
              <TextField n="referenceHigh" l="Reference high" />
              <TextField n="abnormalFlag" l="Abnormal flag" />
              <TextField n="laboratory" l="Laboratory" />
            </>
          ) : null}
          {open === "recurrence" ? (
            <>
              <DateField n="recurrenceDate" l="Date" />
              <SelectField n="recurrenceType" l="Type" o={["Local", "Regional", "Distant", "Combined"]} />
              <TextField n="site" l="Site" />
              <TextField n="confirmationMethod" l="Confirmation" />
              <TextField n="treatment" l="Treatment" />
              <TextField n="treatmentRecommended" l="Treatment recommended" />
              <TextField n="treatmentGiven" l="Treatment given" />
              <Checks names={["local", "regional", "distant"]} />
            </>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm">Save record</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function DateField({ n, l, value }: { n: string; l: string; value?: Date | string | null }) {
  return (
    <label className="text-[12.5px] text-[#45524D]">
      {l}
      <input name={n} type="date" defaultValue={value ? new Date(value).toISOString().slice(0, 10) : ""} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" />
    </label>
  );
}
function TextField({ n, l, value }: { n: string; l: string; value?: string | null }) {
  return (
    <label className="text-[12.5px] text-[#45524D]">
      {l}
      <input name={n} defaultValue={value ?? ""} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" />
    </label>
  );
}
function NumField({ n, l, step }: { n: string; l: string; step?: string }) {
  return (
    <label className="text-[12.5px] text-[#45524D]">
      {l}
      <input name={n} type="number" step={step || "1"} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm" />
    </label>
  );
}
function SelectField({ n, l, o }: { n: string; l: string; o: string[] }) {
  return (
    <label className="text-[12.5px] text-[#45524D]">
      {l}
      <select name={n} className="mt-1 h-10 w-full rounded-[10px] border border-[#E2DDD3] px-2 text-sm">
        <option value="">Select…</option>
        {o.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function Checks({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-[12.5px] sm:col-span-2">
      {names.map((n) => (
        <label key={n} className="flex items-center gap-1.5">
          <input type="checkbox" name={n} />
          {n.replaceAll(/([A-Z])/g, " $1")}
        </label>
      ))}
    </div>
  );
}
