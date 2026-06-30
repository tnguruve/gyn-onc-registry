import Link from "next/link";
import {
  addChemotherapyAction,
  addComplicationAction,
  addFollowUpAction,
  addSurgeryAction,
  saveDiagnosisAction,
  saveHistopathologyAction,
  saveImagingAction,
  saveRadiotherapyAction,
  saveRecurrenceAction,
  saveReferralAction,
  saveResearchAction,
  saveSurvivalAction,
  updateDemographicsAction,
} from "@/app/actions";
import { DeletePatientButton } from "@/components/registry/delete-patient-button";
import { ModuleCard, REGISTRY_MODULES } from "@/components/registry/module-card";
import { SaveFeedback } from "@/components/registry/save-feedback";
import { CodedSelect, CheckboxField } from "@/components/registry/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, FormField, FormRow } from "@/components/ui/field";
import {
  ALIVE_STATUS,
  ART_STATUS,
  CANCER_TYPE,
  CC_SCORE,
  CHEMO_REGIMEN,
  CLAVIEN_DINDO,
  DISEASE_STATUS,
  ECOG,
  EDUCATION_LEVEL,
  FIGO_STAGE,
  GRADE,
  HISTOLOGY,
  HIV_STATUS,
  MARITAL_STATUS,
  MARGIN_STATUS,
  MOLECULAR_RESULT,
  PROVINCES,
  RECURRENCE_SITE,
  REFERRAL_SOURCE,
  SURGICAL_APPROACH,
  labelFor,
} from "@/lib/codes";
import { calcAge, calcDelays, calcSurvivalMetrics } from "@/lib/calculations";
import { CHARLSON_CONDITIONS, parseCharlsonConditions, CANCER_OVARY, CANCER_ENDOMETRIUM } from "@/lib/comorbidities";
import { calcCharlsonIndex, calcSurgicalComplexityScore, calcTimeToRecurrenceDays, calcBmi } from "@/lib/esgo-metrics";
import { formatDate, toInputDate } from "@/lib/utils";
import type { Patient, Referral, Diagnosis, Imaging, Surgery, Histopathology, Chemotherapy, Radiotherapy, Complication, FollowUpVisit, Recurrence, Survival, ResearchModule } from "@prisma/client";

export type PatientRecord = Patient & {
  referral: Referral | null;
  diagnosis: Diagnosis | null;
  imaging: Imaging | null;
  surgeries: Surgery[];
  histopathology: Histopathology | null;
  chemotherapies: Chemotherapy[];
  radiotherapy: Radiotherapy | null;
  complications: Complication[];
  followUps: FollowUpVisit[];
  recurrence: Recurrence | null;
  survival: Survival | null;
  research: ResearchModule | null;
};

export function PatientRegistryChart({
  patient,
  canWrite,
  canDelete,
  savedModule,
  errorMessage,
}: {
  patient: PatientRecord;
  canWrite: boolean;
  canDelete: boolean;
  savedModule?: string | null;
  errorMessage?: string | null;
}) {
  const delays = patient.referral ? calcDelays(patient.referral) : null;
  const survivalMetrics = calcSurvivalMetrics({
    diagnosisDate: patient.referral?.diagnosisDate,
    recurrenceDate: patient.recurrence?.recurrenceDate,
    deathDate: patient.survival?.deathDate,
    aliveStatus: patient.survival?.aliveStatus,
  });

  const pid = patient.id;
  const cancerType = patient.diagnosis?.cancerType;
  const charlsonIndex = calcCharlsonIndex(patient.dateOfBirth, patient.charlsonConditions);
  const charlsonSelected = parseCharlsonConditions(patient.charlsonConditions);
  const timeToRecurrence = calcTimeToRecurrenceDays(
    patient.referral?.diagnosisDate,
    patient.recurrence?.recurrenceDate,
  );
  const autoBmi = calcBmi(patient.heightCm, patient.weightKg) ?? patient.bmi;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-teal-700">{patient.registryNumber}</p>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {patient.surname}, {patient.firstName}
          </h1>
          <p className="text-sm text-slate-600">
            Age {calcAge(patient.dateOfBirth)} · DOB {formatDate(patient.dateOfBirth)} · Hospital #
            {patient.hospitalNumber ?? "—"}
            {cancerType && (
              <> · <span className="font-medium text-teal-700">{labelFor(CANCER_TYPE, cancerType)} module</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDelete ? (
            <DeletePatientButton
              patientId={pid}
              patientLabel={`${patient.registryNumber} — ${patient.surname}, ${patient.firstName}`}
            />
          ) : null}
          <Link href="/patients">
            <Button variant="secondary">Back to search</Button>
          </Link>
        </div>
      </div>

      <SaveFeedback saved={savedModule} error={errorMessage} />

      {!canWrite && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You are in read-only mode. Sign in as a <strong>Clinician</strong> or <strong>Admin</strong> to enter and save data.
        </div>
      )}

      {canWrite && (
        <p className="text-sm text-slate-600">
          Fill in each module, then click the green <strong>Save</strong> button for that section (e.g. &quot;Save diagnosis&quot;). Changes are not stored until you save.
        </p>
      )}

      <nav className="sticky top-0 z-10 -mx-1 flex gap-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 pb-2 text-xs [-webkit-overflow-scrolling:touch]">
        {REGISTRY_MODULES.map((m) => (
          <a
            key={m.id}
            href={`#${m.id}`}
            className="whitespace-nowrap rounded-md px-3 py-2 text-slate-700 hover:bg-teal-50 hover:text-teal-800"
          >
            {m.label}
          </a>
        ))}
      </nav>

      {(delays || survivalMetrics.overallSurvivalDays != null) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {delays && (
            <>
              <Metric label="Patient delay (days)" value={delays.patientDelayDays} />
              <Metric label="Health system delay (days)" value={delays.healthSystemDelayDays} />
              <Metric label="Diagnosis delay (days)" value={delays.diagnosisDelayDays} />
              <Metric label="Treatment delay (days)" value={delays.treatmentDelayDays} />
            </>
          )}
          <Metric label="Overall survival (days)" value={survivalMetrics.overallSurvivalDays} />
          <Metric label="PFS (days)" value={survivalMetrics.progressionFreeSurvivalDays} />
          <Metric label="DFS (days)" value={survivalMetrics.diseaseFreeSurvivalDays} />
          <Metric label="Time to recurrence (days)" value={timeToRecurrence} />
          <Metric label="Charlson index" value={charlsonIndex} />
          <Metric label="BMI (auto)" value={autoBmi} />
        </div>
      )}

      <ModuleCard id="demographics" title="Module 1 — Patient demographics">
        {canWrite ? (
          <form action={updateDemographicsAction.bind(null, pid)} className="space-y-3">
            <FormRow>
              <FormField><Label htmlFor="hospitalNumber">Hospital number</Label><Input id="hospitalNumber" name="hospitalNumber" defaultValue={patient.hospitalNumber ?? ""} /></FormField>
              <FormField><Label htmlFor="nationalId">National ID</Label><Input id="nationalId" name="nationalId" defaultValue={patient.nationalId ?? ""} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="firstName">First name</Label><Input id="firstName" name="firstName" defaultValue={patient.firstName} required /></FormField>
              <FormField><Label htmlFor="surname">Surname</Label><Input id="surname" name="surname" defaultValue={patient.surname} required /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="dateOfBirth">Date of birth</Label><Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={toInputDate(patient.dateOfBirth)} required /></FormField>
              <FormField><CodedSelect id="province" name="province" label="Province" options={PROVINCES} defaultValue={patient.province} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="district">District</Label><Input id="district" name="district" defaultValue={patient.district ?? ""} /></FormField>
              <FormField><CodedSelect id="maritalStatus" name="maritalStatus" label="Marital status" options={MARITAL_STATUS} defaultValue={patient.maritalStatus} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><CodedSelect id="educationLevel" name="educationLevel" label="Education" options={EDUCATION_LEVEL} defaultValue={patient.educationLevel} /></FormField>
              <FormField><Label htmlFor="occupation">Occupation</Label><Input id="occupation" name="occupation" defaultValue={patient.occupation ?? ""} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><CodedSelect id="hivStatus" name="hivStatus" label="HIV status" options={HIV_STATUS} defaultValue={patient.hivStatus} /></FormField>
              <FormField><CodedSelect id="artStatus" name="artStatus" label="ART status" options={ART_STATUS} defaultValue={patient.artStatus} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="artRegimen">ART regimen</Label><Input id="artRegimen" name="artRegimen" defaultValue={patient.artRegimen ?? ""} /></FormField>
              <FormField><Label htmlFor="cd4Count">CD4 count</Label><Input id="cd4Count" name="cd4Count" type="number" defaultValue={patient.cd4Count ?? ""} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="viralLoad">Viral load</Label><Input id="viralLoad" name="viralLoad" defaultValue={patient.viralLoad ?? ""} /></FormField>
              <FormField><CodedSelect id="ecog" name="ecog" label="ECOG" options={ECOG} defaultValue={patient.ecog} /></FormField>
            </FormRow>
            <FormField><Label htmlFor="bmi">BMI</Label><Input id="bmi" name="bmi" type="number" step="0.1" defaultValue={patient.bmi ?? ""} /></FormField>
            <FormRow>
              <FormField><Label htmlFor="heightCm">Height (cm)</Label><Input id="heightCm" name="heightCm" type="number" step="0.1" defaultValue={patient.heightCm ?? ""} /></FormField>
              <FormField><Label htmlFor="weightKg">Weight (kg)</Label><Input id="weightKg" name="weightKg" type="number" step="0.1" defaultValue={patient.weightKg ?? ""} /></FormField>
            </FormRow>
            <FormField>
              <Label>Charlson comorbidities (auto-scored with age)</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {CHARLSON_CONDITIONS.map((c) => (
                  <label key={c.code} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="charlson" value={c.code} defaultChecked={charlsonSelected.includes(c.code)} />
                    {c.label} (+{c.points})
                  </label>
                ))}
              </div>
            </FormField>
            <Button type="submit" size="sm">Save demographics</Button>
          </form>
        ) : (
          <ReadonlyGrid items={[
            ["Province", labelFor(PROVINCES, patient.province)],
            ["HIV", labelFor(HIV_STATUS, patient.hivStatus)],
            ["ECOG", labelFor(ECOG, patient.ecog)],
            ["BMI", patient.bmi?.toString() ?? "—"],
          ]} />
        )}
      </ModuleCard>

      <ModuleCard id="referral" title="Module 2 — Referral & delays" description="Enables diagnostic delay research">
        {canWrite ? (
          <form action={saveReferralAction.bind(null, pid)} className="space-y-3">
            <FormRow>
              <FormField><Label htmlFor="symptomStartDate">Symptom start date</Label><Input id="symptomStartDate" name="symptomStartDate" type="date" defaultValue={toInputDate(patient.referral?.symptomStartDate)} /></FormField>
              <FormField><Label htmlFor="firstHealthFacilityVisit">First health facility visit</Label><Input id="firstHealthFacilityVisit" name="firstHealthFacilityVisit" type="date" defaultValue={toInputDate(patient.referral?.firstHealthFacilityVisit)} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="referralDate">Referral date</Label><Input id="referralDate" name="referralDate" type="date" defaultValue={toInputDate(patient.referral?.referralDate)} /></FormField>
              <FormField><Label htmlFor="dateSeenAtCancerCenter">Date seen at cancer centre</Label><Input id="dateSeenAtCancerCenter" name="dateSeenAtCancerCenter" type="date" defaultValue={toInputDate(patient.referral?.dateSeenAtCancerCenter)} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="diagnosisDate">Diagnosis date</Label><Input id="diagnosisDate" name="diagnosisDate" type="date" defaultValue={toInputDate(patient.referral?.diagnosisDate)} /></FormField>
              <FormField><Label htmlFor="treatmentStartDate">Treatment start date</Label><Input id="treatmentStartDate" name="treatmentStartDate" type="date" defaultValue={toInputDate(patient.referral?.treatmentStartDate)} /></FormField>
            </FormRow>
            <FormField><CodedSelect id="referralSource" name="referralSource" label="Referral source" options={REFERRAL_SOURCE} defaultValue={patient.referral?.referralSource} /></FormField>
            <Button type="submit" size="sm">Save referral</Button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">Diagnosis delay: {delays?.diagnosisDelayDays ?? "—"} days</p>
        )}
      </ModuleCard>

      <ModuleCard id="diagnosis" title="Module 3 — Diagnosis">
        {canWrite ? (
          <form action={saveDiagnosisAction.bind(null, pid)} className="space-y-3">
            <FormRow>
              <FormField><CodedSelect id="cancerType" name="cancerType" label="Cancer type" options={CANCER_TYPE} defaultValue={patient.diagnosis?.cancerType} /></FormField>
              <FormField><CodedSelect id="histology" name="histology" label="Histology" options={HISTOLOGY} defaultValue={patient.diagnosis?.histology} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><CodedSelect id="grade" name="grade" label="Grade" options={GRADE} defaultValue={patient.diagnosis?.grade} /></FormField>
              <FormField><CodedSelect id="figoStage" name="figoStage" label="FIGO stage" options={FIGO_STAGE} defaultValue={patient.diagnosis?.figoStage} /></FormField>
            </FormRow>
            <FormField><Label htmlFor="tnmStage">TNM stage</Label><Input id="tnmStage" name="tnmStage" defaultValue={patient.diagnosis?.tnmStage ?? ""} /></FormField>
            <FormRow>
              <FormField><CheckboxField id="mdtDiscussed" name="mdtDiscussed" label="MDT discussed" defaultChecked={patient.diagnosis?.mdtDiscussed} /></FormField>
              <FormField><Label htmlFor="mdtDate">MDT date</Label><Input id="mdtDate" name="mdtDate" type="date" defaultValue={toInputDate(patient.diagnosis?.mdtDate)} /></FormField>
            </FormRow>
            <Button type="submit" size="sm">Save diagnosis</Button>
          </form>
        ) : (
          <ReadonlyGrid items={[
            ["Cancer", labelFor(CANCER_TYPE, patient.diagnosis?.cancerType)],
            ["FIGO", labelFor(FIGO_STAGE, patient.diagnosis?.figoStage)],
          ]} />
        )}
      </ModuleCard>

      <ModuleCard id="imaging" title="Module 4 — Imaging">
        {canWrite && (
          <form action={saveImagingAction.bind(null, pid)} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckboxField id="ultrasoundDone" name="ultrasoundDone" label="Ultrasound done" defaultChecked={patient.imaging?.ultrasoundDone} />
              <CheckboxField id="ctDone" name="ctDone" label="CT done" defaultChecked={patient.imaging?.ctDone} />
              <CheckboxField id="mriDone" name="mriDone" label="MRI done" defaultChecked={patient.imaging?.mriDone} />
              <CheckboxField id="petDone" name="petDone" label="PET done" defaultChecked={patient.imaging?.petDone} />
            </div>
            <FormRow>
              <FormField><Label htmlFor="tumorSizeMm">Tumour size (mm)</Label><Input id="tumorSizeMm" name="tumorSizeMm" type="number" defaultValue={patient.imaging?.tumorSizeMm ?? ""} /></FormField>
              {cancerType === CANCER_OVARY && (
                <FormField><Label htmlFor="pciScore">PCI score (ovarian)</Label><Input id="pciScore" name="pciScore" type="number" defaultValue={patient.imaging?.pciScore ?? ""} /></FormField>
              )}
            </FormRow>
            <div className="grid gap-2 sm:grid-cols-3">
              <CheckboxField id="lymphNodesPresent" name="lymphNodesPresent" label="Lymph nodes present" defaultChecked={patient.imaging?.lymphNodesPresent} />
              <CheckboxField id="ascites" name="ascites" label="Ascites" defaultChecked={patient.imaging?.ascites} />
              <CheckboxField id="pleuralEffusion" name="pleuralEffusion" label="Pleural effusion" defaultChecked={patient.imaging?.pleuralEffusion} />
            </div>
            <Button type="submit" size="sm">Save imaging</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="surgery" title="Module 5 — Surgery" description="One patient may have multiple surgeries">
        {patient.surgeries.map((s) => (
          <div key={s.id} className="mb-3 rounded-lg border border-slate-100 p-3 text-sm">
            <p className="font-medium">{formatDate(s.surgeryDate)} — {s.procedure ?? "Procedure not recorded"}</p>
            <p className="text-slate-600">{labelFor(SURGICAL_APPROACH, s.approach)} · CC {labelFor(CC_SCORE, s.ccScore)} · Complexity {calcSurgicalComplexityScore(s)}</p>
          </div>
        ))}
        {canWrite && (
          <form action={addSurgeryAction.bind(null, pid)} className="space-y-3 border-t border-slate-100 pt-4">
            <FormRow>
              <FormField><Label htmlFor="surgeryDate">Surgery date *</Label><Input id="surgeryDate" name="surgeryDate" type="date" required /></FormField>
              <FormField><CodedSelect id="approach" name="approach" label="Approach" options={SURGICAL_APPROACH} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="surgeon">Surgeon</Label><Input id="surgeon" name="surgeon" /></FormField>
              <FormField><Label htmlFor="assistant">Assistant</Label><Input id="assistant" name="assistant" /></FormField>
            </FormRow>
            <FormField><Label htmlFor="procedure">Procedure</Label><Input id="procedure" name="procedure" /></FormField>
            <FormRow>
              <FormField><Label htmlFor="operativeTimeMinutes">Operating time (min)</Label><Input id="operativeTimeMinutes" name="operativeTimeMinutes" type="number" /></FormField>
              <FormField><Label htmlFor="bloodLossMl">Blood loss (ml)</Label><Input id="bloodLossMl" name="bloodLossMl" type="number" /></FormField>
            </FormRow>
            <FormField><CodedSelect id="ccScore" name="ccScore" label="CC score" options={CC_SCORE} /></FormField>
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckboxField id="transfusion" name="transfusion" label="Transfusion" />
              <CheckboxField id="bowelResection" name="bowelResection" label="Bowel resection" />
              <CheckboxField id="bladderResection" name="bladderResection" label="Bladder resection" />
              <CheckboxField id="stoma" name="stoma" label="Stoma" />
            </div>
            <Button type="submit" size="sm">Add surgery</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="histopathology" title="Module 6 — Histopathology & molecular markers">
        {canWrite && (
          <form action={saveHistopathologyAction.bind(null, pid)} className="space-y-3">
            <FormRow>
              <FormField><Label htmlFor="pathologyDate">Pathology date</Label><Input id="pathologyDate" name="pathologyDate" type="date" defaultValue={toInputDate(patient.histopathology?.pathologyDate)} /></FormField>
              <FormField><CodedSelect id="hpHistology" name="histology" label="Histology" options={HISTOLOGY} defaultValue={patient.histopathology?.histology} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="nodesRemoved">Nodes removed</Label><Input id="nodesRemoved" name="nodesRemoved" type="number" defaultValue={patient.histopathology?.nodesRemoved ?? ""} /></FormField>
              <FormField><Label htmlFor="positiveNodes">Positive nodes</Label><Input id="positiveNodes" name="positiveNodes" type="number" defaultValue={patient.histopathology?.positiveNodes ?? ""} /></FormField>
            </FormRow>
            <FormField><CodedSelect id="marginStatus" name="marginStatus" label="Margin status" options={MARGIN_STATUS} defaultValue={patient.histopathology?.marginStatus} /></FormField>
            <FormField><CheckboxField id="lvsi" name="lvsi" label="LVSI" defaultChecked={patient.histopathology?.lvsi} /></FormField>
            {(cancerType === CANCER_ENDOMETRIUM || cancerType === CANCER_OVARY) && (
              <p className="text-sm font-medium text-slate-700">
                {cancerType === CANCER_ENDOMETRIUM ? "Endometrial molecular markers" : "Ovarian molecular markers"}
              </p>
            )}
            {cancerType === CANCER_ENDOMETRIUM && (
              <FormRow>
                <FormField><CodedSelect id="p53" name="p53" label="p53" options={MOLECULAR_RESULT} defaultValue={patient.histopathology?.p53} /></FormField>
                <FormField><CodedSelect id="mmr" name="mmr" label="MMR" options={MOLECULAR_RESULT} defaultValue={patient.histopathology?.mmr} /></FormField>
                <FormField><CodedSelect id="pole" name="pole" label="POLE" options={MOLECULAR_RESULT} defaultValue={patient.histopathology?.pole} /></FormField>
                <FormField><CodedSelect id="er" name="er" label="ER" options={MOLECULAR_RESULT} defaultValue={patient.histopathology?.er} /></FormField>
                <FormField><CodedSelect id="pr" name="pr" label="PR" options={MOLECULAR_RESULT} defaultValue={patient.histopathology?.pr} /></FormField>
              </FormRow>
            )}
            {cancerType === CANCER_OVARY && (
              <FormRow>
                <FormField><CodedSelect id="brca" name="brca" label="BRCA" options={MOLECULAR_RESULT} defaultValue={patient.histopathology?.brca} /></FormField>
                <FormField><CodedSelect id="hrd" name="hrd" label="HRD" options={MOLECULAR_RESULT} defaultValue={patient.histopathology?.hrd} /></FormField>
                <FormField><Label htmlFor="ca125">CA125</Label><Input id="ca125" name="ca125" type="number" defaultValue={patient.histopathology?.ca125 ?? ""} /></FormField>
                <FormField><Label htmlFor="he4">HE4</Label><Input id="he4" name="he4" type="number" defaultValue={patient.histopathology?.he4 ?? ""} /></FormField>
              </FormRow>
            )}
            <Button type="submit" size="sm">Save histopathology</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="chemotherapy" title="Module 7 — Chemotherapy">
        {patient.chemotherapies.map((c) => (
          <div key={c.id} className="mb-2 rounded border border-slate-100 p-2 text-sm">
            {formatDate(c.chemoStartDate)} — {labelFor(CHEMO_REGIMEN, c.regimen)} ({c.cyclesReceived ?? 0}/{c.cyclesPlanned ?? "?"} cycles)
          </div>
        ))}
        {canWrite && (
          <form action={addChemotherapyAction.bind(null, pid)} className="space-y-3 border-t pt-3">
            <FormRow>
              <FormField><Label htmlFor="chemoStartDate">Start date</Label><Input id="chemoStartDate" name="chemoStartDate" type="date" /></FormField>
              <FormField><CodedSelect id="regimen" name="regimen" label="Regimen" options={CHEMO_REGIMEN} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="cyclesPlanned">Cycles planned</Label><Input id="cyclesPlanned" name="cyclesPlanned" type="number" /></FormField>
              <FormField><Label htmlFor="cyclesReceived">Cycles received</Label><Input id="cyclesReceived" name="cyclesReceived" type="number" /></FormField>
            </FormRow>
            <CheckboxField id="doseReduction" name="doseReduction" label="Dose reduction" />
            <CheckboxField id="stoppedEarly" name="stoppedEarly" label="Stopped early" />
            <Button type="submit" size="sm">Add chemotherapy</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="radiotherapy" title="Module 8 — Radiotherapy">
        {canWrite && (
          <form action={saveRadiotherapyAction.bind(null, pid)} className="space-y-3">
            <CheckboxField id="ebrtGiven" name="ebrtGiven" label="EBRT given" defaultChecked={patient.radiotherapy?.ebrtGiven} />
            <FormRow>
              <FormField><Label htmlFor="ebrtStart">EBRT start</Label><Input id="ebrtStart" name="ebrtStart" type="date" defaultValue={toInputDate(patient.radiotherapy?.ebrtStart)} /></FormField>
              <FormField><Label htmlFor="ebrtEnd">EBRT end</Label><Input id="ebrtEnd" name="ebrtEnd" type="date" defaultValue={toInputDate(patient.radiotherapy?.ebrtEnd)} /></FormField>
            </FormRow>
            <FormRow>
              <FormField><Label htmlFor="doseGy">Dose (Gy)</Label><Input id="doseGy" name="doseGy" type="number" step="0.1" defaultValue={patient.radiotherapy?.doseGy ?? ""} /></FormField>
              <FormField><Label htmlFor="fractions">Fractions</Label><Input id="fractions" name="fractions" type="number" defaultValue={patient.radiotherapy?.fractions ?? ""} /></FormField>
            </FormRow>
            <CheckboxField id="brachytherapyGiven" name="brachytherapyGiven" label="Brachytherapy given" defaultChecked={patient.radiotherapy?.brachytherapyGiven} />
            <CheckboxField id="interrupted" name="interrupted" label="Interrupted" defaultChecked={patient.radiotherapy?.interrupted} />
            <Button type="submit" size="sm">Save radiotherapy</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="complications" title="Module 9 — Complications (Clavien-Dindo)">
        {patient.complications.map((c) => (
          <div key={c.id} className="mb-2 rounded border border-slate-100 p-2 text-sm">
            {formatDate(c.complicationDate)} — {c.complicationType ?? "Complication"} · {labelFor(CLAVIEN_DINDO, c.clavienDindoGrade)}
          </div>
        ))}
        {canWrite && (
          <form action={addComplicationAction.bind(null, pid)} className="space-y-3 border-t pt-3">
            <FormRow>
              <FormField><Label htmlFor="complicationDate">Date</Label><Input id="complicationDate" name="complicationDate" type="date" /></FormField>
              <FormField><CodedSelect id="clavienDindoGrade" name="clavienDindoGrade" label="Clavien-Dindo grade" options={CLAVIEN_DINDO} /></FormField>
            </FormRow>
            <FormField><Label htmlFor="complicationType">Complication type</Label><Input id="complicationType" name="complicationType" /></FormField>
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckboxField id="readmission" name="readmission" label="Readmission" />
              <CheckboxField id="reoperation" name="reoperation" label="Reoperation" />
              <CheckboxField id="mortality30Day" name="mortality30Day" label="30-day mortality" />
              <CheckboxField id="mortality90Day" name="mortality90Day" label="90-day mortality" />
            </div>
            <Button type="submit" size="sm">Add complication</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="followup" title="Module 10 — Follow-up visits">
        {patient.followUps.map((f) => (
          <div key={f.id} className="mb-2 rounded border border-slate-100 p-2 text-sm">
            {formatDate(f.visitDate)} — {labelFor(DISEASE_STATUS, f.diseaseStatus)} · ECOG {labelFor(ECOG, f.ecog)}
          </div>
        ))}
        {canWrite && (
          <form action={addFollowUpAction.bind(null, pid)} className="space-y-3 border-t pt-3">
            <FormRow>
              <FormField><Label htmlFor="visitDate">Visit date *</Label><Input id="visitDate" name="visitDate" type="date" required /></FormField>
              <FormField><CodedSelect id="fEcog" name="ecog" label="ECOG" options={ECOG} /></FormField>
            </FormRow>
            <FormField><CodedSelect id="diseaseStatus" name="diseaseStatus" label="Disease status" options={DISEASE_STATUS} /></FormField>
            <FormField><Label htmlFor="symptoms">Symptoms</Label><Textarea id="symptoms" name="symptoms" rows={2} /></FormField>
            <Button type="submit" size="sm">Add follow-up visit</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="recurrence" title="Module 11 — Recurrence">
        {canWrite && (
          <form action={saveRecurrenceAction.bind(null, pid)} className="space-y-3">
            <FormRow>
              <FormField><Label htmlFor="recurrenceDate">Recurrence date</Label><Input id="recurrenceDate" name="recurrenceDate" type="date" defaultValue={toInputDate(patient.recurrence?.recurrenceDate)} /></FormField>
              <FormField><CodedSelect id="recurrenceSite" name="recurrenceSite" label="Site" options={RECURRENCE_SITE} defaultValue={patient.recurrence?.recurrenceSite} /></FormField>
            </FormRow>
            <CheckboxField id="biopsyConfirmed" name="biopsyConfirmed" label="Biopsy confirmed" defaultChecked={patient.recurrence?.biopsyConfirmed} />
            <FormField><Label htmlFor="treatmentForRecurrence">Treatment for recurrence</Label><Textarea id="treatmentForRecurrence" name="treatmentForRecurrence" rows={2} defaultValue={patient.recurrence?.treatmentForRecurrence ?? ""} /></FormField>
            <Button type="submit" size="sm">Save recurrence</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="survival" title="Module 12 — Survival outcomes">
        {canWrite && (
          <form action={saveSurvivalAction.bind(null, pid)} className="space-y-3">
            <FormField><CodedSelect id="aliveStatus" name="aliveStatus" label="Status" options={ALIVE_STATUS} defaultValue={patient.survival?.aliveStatus} /></FormField>
            <FormRow>
              <FormField><Label htmlFor="dateLastSeen">Date last seen</Label><Input id="dateLastSeen" name="dateLastSeen" type="date" defaultValue={toInputDate(patient.survival?.dateLastSeen)} /></FormField>
              <FormField><Label htmlFor="deathDate">Death date</Label><Input id="deathDate" name="deathDate" type="date" defaultValue={toInputDate(patient.survival?.deathDate)} /></FormField>
            </FormRow>
            <FormField><Label htmlFor="causeOfDeath">Cause of death</Label><Input id="causeOfDeath" name="causeOfDeath" defaultValue={patient.survival?.causeOfDeath ?? ""} /></FormField>
            <Button type="submit" size="sm">Save survival</Button>
          </form>
        )}
      </ModuleCard>

      <ModuleCard id="research" title="Module 13 — Research / biobank">
        {canWrite && (
          <form action={saveResearchAction.bind(null, pid)} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckboxField id="consentForResearch" name="consentForResearch" label="Consent for research" defaultChecked={patient.research?.consentForResearch} />
              <CheckboxField id="consentForGenetics" name="consentForGenetics" label="Consent for genetics" defaultChecked={patient.research?.consentForGenetics} />
              <CheckboxField id="tissueBank" name="tissueBank" label="Tissue bank" defaultChecked={patient.research?.tissueBank} />
              <CheckboxField id="bloodSamples" name="bloodSamples" label="Blood samples" defaultChecked={patient.research?.bloodSamples} />
              <CheckboxField id="genomicTesting" name="genomicTesting" label="Genomic testing" defaultChecked={patient.research?.genomicTesting} />
            </div>
            <FormField><Label htmlFor="qualityOfLifeScores">Quality of life / PROMs</Label><Textarea id="qualityOfLifeScores" name="qualityOfLifeScores" rows={2} defaultValue={patient.research?.qualityOfLifeScores ?? ""} /></FormField>
            <Button type="submit" size="sm">Save research module</Button>
          </form>
        )}
      </ModuleCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-teal-800">{value ?? "—"}</p>
    </div>
  );
}

function ReadonlyGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <p key={k}><span className="text-slate-500">{k}:</span> {v}</p>
      ))}
    </div>
  );
}
