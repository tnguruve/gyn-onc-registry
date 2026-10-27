import type { ReferralEpisode } from "@prisma/client";
import { addReferralEpisodeAction } from "@/app/history-actions";
import { Button } from "@/components/ui/button";
import { FormField, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toInputDate } from "@/lib/utils";

const REASONS = ["Diagnostic work-up", "Staging", "Surgery", "Systemic therapy", "Radiotherapy", "Palliation", "Other"];

export function ReferralEpisodeForm({ patientId, episode }: { patientId: string; episode?: ReferralEpisode }) {
  let reasons: string[] = [];
  try { reasons = episode ? JSON.parse(episode.referralReasons) as string[] : []; } catch { reasons = []; }
  return (
    <form action={addReferralEpisodeAction.bind(null, patientId)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {episode ? <input type="hidden" name="episodeId" value={episode.id} /> : null}
      <DateInput name="referralDate" label="Referral date" value={episode?.referralDate} />
      <DateInput name="referralReceived" label="Referral received" value={episode?.referralReceived} />
      <DateInput name="firstContactDate" label="First contact" value={episode?.firstContactDate} />
      <DateInput name="firstSeenDate" label="First seen at cancer centre" value={episode?.firstSeenDate} />
      <TextInput name="referralSource" label="Referral source" value={episode?.referralSource} />
      <TextInput name="referralFacility" label="Referring facility" value={episode?.referralFacility} />
      <TextInput name="referralLevel" label="Level of care" value={episode?.referralLevel} />
      <TextInput name="referralUrgency" label="Urgency" value={episode?.referralUrgency} />
      <TextInput name="suspectedCa" label="Suspected cancer code" value={episode?.suspectedCa} />
      <FormField><Label htmlFor={`previousFacilities-${episode?.id ?? "new"}`}>Previous facilities</Label><Input id={`previousFacilities-${episode?.id ?? "new"}`} name="previousFacilities" type="number" min="0" defaultValue={episode?.previousFacilities ?? ""} /></FormField>
      <DateInput name="symptomStartDate" label="Symptom start" value={episode?.symptomStartDate} />
      <DateInput name="firstFacilityVisit" label="First facility visit" value={episode?.firstFacilityVisit} />
      <DateInput name="diagnosisDate" label="Diagnosis date" value={episode?.diagnosisDate} />
      <DateInput name="treatmentStartDate" label="Treatment start" value={episode?.treatmentStartDate} />
      <div className="sm:col-span-2 lg:col-span-3">
        <Label>Referral reasons</Label>
        <div className="mt-2 flex flex-wrap gap-3">
          {REASONS.map((reason) => <label key={reason} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="referralReasons" value={reason} defaultChecked={reasons.includes(reason)} />{reason}</label>)}
        </div>
      </div>
      <FormField className="sm:col-span-2 lg:col-span-3"><Label htmlFor={`referralNotes-${episode?.id ?? "new"}`}>Referral notes</Label><Input id={`referralNotes-${episode?.id ?? "new"}`} name="referralNotes" defaultValue={episode?.referralNotes ?? ""} /></FormField>
      <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" size="sm">{episode ? "Save referral changes" : "Add referral episode"}</Button></div>
    </form>
  );
}

function TextInput({ name, label, value }: { name: string; label: string; value?: string | null }) {
  return <FormField><Label>{label}</Label><Input name={name} defaultValue={value ?? ""} /></FormField>;
}

function DateInput({ name, label, value }: { name: string; label: string; value?: Date | null }) {
  return <FormField><Label>{label}</Label><Input name={name} type="date" defaultValue={toInputDate(value)} /></FormField>;
}
