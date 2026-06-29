import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ALIVE_STATUS,
  CANCER_TYPE,
  CHEMO_REGIMEN,
  CLAVIEN_DINDO,
  DISEASE_STATUS,
  ECOG,
  FIGO_STAGE,
  GRADE,
  HISTOLOGY,
  HIV_STATUS,
  MARITAL_STATUS,
  PROVINCES,
  RECURRENCE_SITE,
  REFERRAL_SOURCE,
  SURGICAL_APPROACH,
} from "@/lib/codes";
import { CHARLSON_CONDITIONS } from "@/lib/comorbidities";

const SECTIONS: { title: string; variables: { name: string; codes: { code: string; label: string }[] }[] }[] = [
  { title: "Demographics", variables: [{ name: "province", codes: PROVINCES }, { name: "marital_status", codes: MARITAL_STATUS }, { name: "hiv_status", codes: HIV_STATUS }, { name: "ecog", codes: ECOG }] },
  { title: "Diagnosis", variables: [{ name: "cancer_type", codes: CANCER_TYPE }, { name: "histology", codes: HISTOLOGY }, { name: "grade", codes: GRADE }, { name: "figo_stage", codes: FIGO_STAGE }] },
  { title: "Referral", variables: [{ name: "referral_source", codes: REFERRAL_SOURCE }] },
  { title: "Surgery", variables: [{ name: "approach", codes: SURGICAL_APPROACH }] },
  { title: "Treatment", variables: [{ name: "chemo_regimen", codes: CHEMO_REGIMEN }] },
  { title: "Outcomes", variables: [{ name: "disease_status", codes: DISEASE_STATUS }, { name: "recurrence_site", codes: RECURRENCE_SITE }, { name: "alive_status", codes: ALIVE_STATUS }, { name: "clavien_dindo", codes: CLAVIEN_DINDO }] },
  { title: "Charlson comorbidities", variables: [{ name: "charlson_condition", codes: CHARLSON_CONDITIONS.map((c) => ({ code: c.code, label: `${c.label} (+${c.points})` })) }] },
];

export default function DictionaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Data dictionary</h1>
        <p className="text-sm text-slate-600">REDCap-style coded variables for the Zimbabwe Gyn Onc Registry.</p>
      </div>
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {section.variables.map((v) => (
              <div key={v.name}>
                <p className="mb-2 font-mono text-sm font-medium text-teal-800">{v.name}</p>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-1 pr-4">Code</th>
                      <th className="py-1">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.codes.map((c) => (
                      <tr key={c.code} className="border-b border-slate-50">
                        <td className="py-1 pr-4 font-mono">{c.code}</td>
                        <td className="py-1">{c.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
