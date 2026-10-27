import { requirePermission } from "@/lib/auth";
import { createPatientAction } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField, FormRow } from "@/components/ui/field";
import { CodedSelect } from "@/components/registry/form-fields";
import {
  EDUCATION_LEVEL,
  MARITAL_STATUS,
  PROVINCES,
  REGISTRATION_SITES,
  RESIDENCE_TYPE,
  SEX_AT_BIRTH,
} from "@/lib/codes";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("patients:create");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Register patient</h1>
        <p className="text-sm text-slate-600">
          Instrument 1 — registration. A registry number (GYN-000001 style) is assigned automatically.
          Oncology modules are completed on the patient chart after save.
        </p>
      </div>

      <div className="rounded-lg border border-[#D5E4E2] bg-[#ECF3F2] px-4 py-3 text-sm text-[#45524D]">
        <strong className="text-[#0C4F4E]">After you save:</strong> Modules 2–13 (referral, diagnosis, MDT,
        imaging, surgery, pathology, treatment, follow-up, and more) are completed on the{" "}
        <strong>patient record</strong> — open the new case from Patients to continue.
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {decodeURIComponent(error)}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Patient demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPatientAction} className="space-y-3">
            <FormRow>
              <FormField>
                <Label htmlFor="hospitalNumber">Hospital number *</Label>
                <Input id="hospitalNumber" name="hospitalNumber" required />
              </FormField>
              <FormField>
                <Label htmlFor="nationalId">National ID</Label>
                <Input id="nationalId" name="nationalId" />
                <p className="mt-1 text-xs text-slate-500">Same national ID means the same person.</p>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="registrationDate">Registration date</Label>
                <Input id="registrationDate" name="registrationDate" type="date" />
              </FormField>
              <FormField>
                <CodedSelect id="registrationSite" name="registrationSite" label="Registering facility" options={REGISTRATION_SITES} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue="Zimbabwe" />
              </FormField>
              <FormField>
                <CodedSelect id="province" name="province" label="Province" options={PROVINCES} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" name="firstName" required />
              </FormField>
              <FormField>
                <Label htmlFor="surname">Surname *</Label>
                <Input id="surname" name="surname" required />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="dateOfBirth">Date of birth *</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
              </FormField>
              <FormField>
                <Label htmlFor="district">District</Label>
                <Input id="district" name="district" />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <CodedSelect id="maritalStatus" name="maritalStatus" label="Marital status" options={MARITAL_STATUS} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <CodedSelect id="educationLevel" name="educationLevel" label="Education" options={EDUCATION_LEVEL} />
              </FormField>
              <FormField>
                <Label htmlFor="occupation">Occupation</Label>
                <Input id="occupation" name="occupation" />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <CodedSelect id="sexAtBirth" name="sexAtBirth" label="Sex at birth" options={SEX_AT_BIRTH} />
              </FormField>
              <FormField>
                <CodedSelect id="residenceType" name="residenceType" label="Residence" options={RESIDENCE_TYPE} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="phone">Primary phone</Label>
                <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+263 77 123 4567" />
              </FormField>
              <FormField>
                <Label htmlFor="phoneAlt">Alternative phone</Label>
                <Input id="phoneAlt" name="phoneAlt" type="tel" />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="nextOfKin">Next of kin</Label>
                <Input id="nextOfKin" name="nextOfKin" />
              </FormField>
              <FormField>
                <Label htmlFor="nokPhone">Next-of-kin phone</Label>
                <Input id="nokPhone" name="nokPhone" type="tel" />
              </FormField>
            </FormRow>
            <p className="text-xs text-slate-500">Contact details are for clinical follow-up only — not included in de-identified exports.</p>
            <Button type="submit">Create registry record</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
