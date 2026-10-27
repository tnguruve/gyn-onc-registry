"use client";

import { useState } from "react";
import {
  addFamilyCancerAction,
  deleteFamilyCancerAction,
  saveGynHistoryAction,
  saveMedicalHistoryAction,
} from "@/app/history-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/field";
import { CodedSelect } from "@/components/registry/form-fields";
import { ART_STATUS, HIV_STATUS, MENSTRUAL_STATUS, SMOKING, YNU, labelFor } from "@/lib/codes";
import { toInputDate } from "@/lib/utils";
import type { FamilyCancer, GynHistory, MedicalHistory } from "@prisma/client";

const MEDICAL = [
  ["hypertension", "Hypertension"],
  ["diabetes", "Diabetes"],
  ["obesity", "Obesity"],
  ["renalDisease", "Renal disease"],
  ["cardiacDisease", "Cardiac disease"],
  ["tbHistory", "TB history"],
  ["previousCancer", "Previous cancer"],
  ["previousRadiotherapy", "Previous radiotherapy"],
  ["previousChemotherapy", "Previous chemotherapy"],
] as const;

export function HistoryInstruments({
  patientId,
  gyn,
  medical,
  family,
  canWrite,
}: {
  patientId: string;
  gyn: GynHistory | null;
  medical: MedicalHistory | null;
  family: FamilyCancer[];
  canWrite: boolean;
}) {
  const [screened, setScreened] = useState(gyn?.screenedEver ?? "");
  const [hiv, setHiv] = useState(medical?.hivStatus ?? "");
  const [smoking, setSmoking] = useState(medical?.smoking ?? "");
  const [familyCancer, setFamilyCancer] = useState(medical?.familyCancer ?? "");
  return (
    <div className="space-y-5">
      <section id="gyn-history" className="scroll-mt-24 rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <h2 className="mb-3 text-[15px] font-semibold">Gynaecological and obstetric history</h2>
        {canWrite ? (
          <form action={saveGynHistoryAction.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
            <Num name="menarcheAge" label="Menarche age" defaultValue={gyn?.menarcheAge} />
            <FormField>
              <Label htmlFor="lmp">Last menstrual period</Label>
              <Input id="lmp" name="lmp" type="date" defaultValue={toInputDate(gyn?.lmp)} />
            </FormField>
            <CodedSelect id="menstrualStatus" name="menstrualStatus" label="Menstrual status" options={MENSTRUAL_STATUS} defaultValue={gyn?.menstrualStatus} />
            <Num name="menopauseAge" label="Menopause age" defaultValue={gyn?.menopauseAge} />
            <Num name="yearsPostmenopause" label="Years post menopause" defaultValue={gyn?.yearsPostmenopause} />
            <Num name="gravidity" label="Gravidity" defaultValue={gyn?.gravidity} />
            <Num name="parity" label="Parity" defaultValue={gyn?.parity} />
            <Num name="livingChildren" label="Living children" defaultValue={gyn?.livingChildren} />
            <Num name="ageFirstPregnancy" label="Age at first pregnancy" defaultValue={gyn?.ageFirstPregnancy} />
            <Num name="ageFirstBirth" label="Age at first birth" defaultValue={gyn?.ageFirstBirth} />
            <CodedSelect id="contraceptionEver" name="contraceptionEver" label="Contraception ever" options={YNU} defaultValue={gyn?.contraceptionEver} />
            <CodedSelect id="ocp" name="ocp" label="Oral contraceptive" options={YNU} defaultValue={gyn?.ocp} />
            <Num name="ocpDurationMonths" label="OCP duration (months)" defaultValue={gyn?.ocpDurationMonths} />
            <CodedSelect id="injectable" name="injectable" label="Injectable" options={YNU} defaultValue={gyn?.injectable} />
            <CodedSelect id="implant" name="implant" label="Implant" options={YNU} defaultValue={gyn?.implant} />
            <CodedSelect id="iud" name="iud" label="IUD" options={YNU} defaultValue={gyn?.iud} />
            <ControlledCodeSelect id="screenedEver" name="screenedEver" label="Ever screened (cervix)" options={YNU} value={screened} onChange={setScreened} />
            {screened === "1" ? <>
            <FormField>
              <Label htmlFor="lastScreenDate">Last screen date</Label>
              <Input id="lastScreenDate" name="lastScreenDate" type="date" defaultValue={toInputDate(gyn?.lastScreenDate)} />
            </FormField>
            <Text name="screenMethod" label="Screen method" defaultValue={gyn?.screenMethod} />
            <Text name="screenResult" label="Screen result" defaultValue={gyn?.screenResult} />
            <CodedSelect id="previousAbnormal" name="previousAbnormal" label="Previous abnormal screen" options={YNU} defaultValue={gyn?.previousAbnormal} />
            <CodedSelect id="previousCin" name="previousCin" label="Previous CIN" options={YNU} defaultValue={gyn?.previousCin} />
            <Text name="cinGrade" label="CIN grade" defaultValue={gyn?.cinGrade} />
            <Text name="cinTreatment" label="CIN treatment" defaultValue={gyn?.cinTreatment} />
            </> : null}
            <div className="sm:col-span-2"><Button type="submit" size="sm">Save gyn / obstetric history</Button></div>
          </form>
        ) : (
          <p className="text-sm text-[#5C6B66]">Menstrual status {labelFor(MENSTRUAL_STATUS, gyn?.menstrualStatus)} · Parity {gyn?.parity ?? "—"} · Screened {labelFor(YNU, gyn?.screenedEver)}</p>
        )}
      </section>

      <section id="medical-history" className="scroll-mt-24 rounded-2xl border border-[#EAE5DA] bg-white p-5">
        <h2 className="mb-3 text-[15px] font-semibold">Medical, family and social history</h2>
        {canWrite ? (
          <form action={saveMedicalHistoryAction.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2">
            {MEDICAL.map(([name, label]) => (
              <CodedSelect key={name} id={name} name={name} label={label} options={YNU} defaultValue={medical?.[name]} />
            ))}
            <ControlledCodeSelect id="mhHivStatus" name="hivStatus" label="HIV status" options={HIV_STATUS} value={hiv} onChange={setHiv} />
            {hiv === "1" ? <>
            <FormField>
              <Label htmlFor="hivDiagnosisDate">HIV diagnosis date</Label>
              <Input id="hivDiagnosisDate" name="hivDiagnosisDate" type="date" defaultValue={toInputDate(medical?.hivDiagnosisDate)} />
            </FormField>
            <CodedSelect id="mhArtStatus" name="artStatus" label="ART status" options={ART_STATUS} defaultValue={medical?.artStatus} />
            <Text name="artRegimen" label="ART regimen" defaultValue={medical?.artRegimen} />
            <FormField>
              <Label htmlFor="artStartDate">ART start date</Label>
              <Input id="artStartDate" name="artStartDate" type="date" defaultValue={toInputDate(medical?.artStartDate)} />
            </FormField>
            <Num name="latestCd4" label="Latest CD4" defaultValue={medical?.latestCd4} />
            <Text name="viralLoad" label="Viral load" defaultValue={medical?.viralLoad} />
            <FormField>
              <Label htmlFor="cd4Date">CD4 date</Label>
              <Input id="cd4Date" name="cd4Date" type="date" defaultValue={toInputDate(medical?.cd4Date)} />
            </FormField>
            <FormField>
              <Label htmlFor="viralLoadDate">Viral load date</Label>
              <Input id="viralLoadDate" name="viralLoadDate" type="date" defaultValue={toInputDate(medical?.viralLoadDate)} />
            </FormField>
            </> : null}
            <ControlledCodeSelect id="smoking" name="smoking" label="Smoking" options={SMOKING} value={smoking} onChange={setSmoking} />
            {smoking && smoking !== "1" && smoking !== "9" ? <Num name="packYears" label="Pack years" defaultValue={medical?.packYears} step="0.1" /> : null}
            <ControlledCodeSelect id="familyCancer" name="familyCancer" label="Family history of cancer" options={YNU} value={familyCancer} onChange={setFamilyCancer} />
            <div className="sm:col-span-2"><Button type="submit" size="sm">Save medical history</Button></div>
          </form>
        ) : (
          <p className="text-sm text-[#5C6B66]">Smoking {labelFor(SMOKING, medical?.smoking)} · Family cancer {labelFor(YNU, medical?.familyCancer)}</p>
        )}
        {familyCancer === "1" ? <><ul className="mt-4 space-y-1 text-sm">
          {family.map((f) => (
            <li key={f.id}>
              <details>
                <summary className="cursor-pointer">{f.relative || "Relative"} · {f.cancerType || "cancer"} · age {f.ageAtDiagnosis ?? "—"}</summary>
                {canWrite ? <form action={addFamilyCancerAction.bind(null, patientId)} className="mt-2 grid gap-2 rounded-xl bg-[#FBFAF6] p-3 sm:grid-cols-4">
                  <input type="hidden" name="familyCancerId" value={f.id} />
                  <Text name="relative" label="Relative" defaultValue={f.relative} />
                  <Text name="cancerType" label="Cancer type" defaultValue={f.cancerType} />
                  <Num name="ageAtDiagnosis" label="Age" defaultValue={f.ageAtDiagnosis} />
                  <div className="flex items-end gap-2"><Button type="submit" size="sm">Save</Button><Button type="submit" formAction={deleteFamilyCancerAction.bind(null, patientId, f.id)} variant="secondary" size="sm">Delete</Button></div>
                </form> : null}
              </details>
            </li>
          ))}
        </ul>
        {canWrite ? (
          <form action={addFamilyCancerAction.bind(null, patientId)} className="mt-3 grid gap-2 sm:grid-cols-4">
            <Text name="relative" label="Relative" />
            <Text name="cancerType" label="Cancer type" />
            <Num name="ageAtDiagnosis" label="Age at diagnosis" />
            <div className="flex items-end"><Button type="submit" size="sm">Add relative</Button></div>
          </form>
        ) : null}</> : null}
      </section>
    </div>
  );
}

function ControlledCodeSelect({ id, name, label, options, value, onChange }: { id: string; name: string; label: string; options: { code: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return <FormField><Label htmlFor={id}>{label}</Label><select id={id} name={name} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-[10px] border border-[#E2DDD3] bg-white px-2 text-sm"><option value="">Select…</option>{options.map((option) => <option key={option.code} value={option.code}>{option.code} — {option.label}</option>)}</select></FormField>;
}

function Text({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <FormField>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} />
    </FormField>
  );
}

function Num({ name, label, defaultValue, step }: { name: string; label: string; defaultValue?: number | null; step?: string }) {
  return (
    <FormField>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" step={step || "1"} defaultValue={defaultValue ?? ""} />
    </FormField>
  );
}
