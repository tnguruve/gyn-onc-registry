import { requirePermission } from "@/lib/auth";
import { createPatientAction } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField, FormRow } from "@/components/ui/field";
import { CodedSelect } from "@/components/registry/form-fields";
import {
  ART_STATUS,
  ECOG,
  EDUCATION_LEVEL,
  HIV_STATUS,
  MARITAL_STATUS,
  PROVINCES,
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
          Module 1 — demographics. A registry number (GYN0001) is assigned automatically.
        </p>
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
                <Label htmlFor="hospitalNumber">Hospital number</Label>
                <Input id="hospitalNumber" name="hospitalNumber" />
              </FormField>
              <FormField>
                <Label htmlFor="nationalId">National ID</Label>
                <Input id="nationalId" name="nationalId" />
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
                <CodedSelect id="province" name="province" label="Province" options={PROVINCES} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <Label htmlFor="district">District</Label>
                <Input id="district" name="district" />
              </FormField>
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
            <FormField>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+263 77 123 4567" />
            </FormField>
            <p className="text-xs text-slate-500">Contact details are for clinical follow-up only — not included in de-identified exports.</p>
            <FormRow>
              <FormField>
                <CodedSelect id="hivStatus" name="hivStatus" label="HIV status" options={HIV_STATUS} />
              </FormField>
              <FormField>
                <CodedSelect id="artStatus" name="artStatus" label="ART status" options={ART_STATUS} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField>
                <CodedSelect id="ecog" name="ecog" label="ECOG performance status" options={ECOG} />
              </FormField>
              <FormField>
                <Label htmlFor="bmi">BMI</Label>
                <Input id="bmi" name="bmi" type="number" step="0.1" />
              </FormField>
            </FormRow>
            <Button type="submit">Create registry record</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
