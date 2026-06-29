export type CodeOption = { code: string; label: string };

export const PROVINCES: CodeOption[] = [
  { code: "1", label: "Bulawayo" },
  { code: "2", label: "Harare" },
  { code: "3", label: "Manicaland" },
  { code: "4", label: "Mashonaland Central" },
  { code: "5", label: "Mashonaland East" },
  { code: "6", label: "Mashonaland West" },
  { code: "7", label: "Masvingo" },
  { code: "8", label: "Matabeleland North" },
  { code: "9", label: "Matabeleland South" },
  { code: "10", label: "Midlands" },
];

export const MARITAL_STATUS: CodeOption[] = [
  { code: "1", label: "Single" },
  { code: "2", label: "Married" },
  { code: "3", label: "Divorced" },
  { code: "4", label: "Widowed" },
  { code: "5", label: "Unknown" },
];

export const EDUCATION_LEVEL: CodeOption[] = [
  { code: "1", label: "None" },
  { code: "2", label: "Primary" },
  { code: "3", label: "Secondary" },
  { code: "4", label: "Tertiary" },
  { code: "5", label: "Unknown" },
];

export const HIV_STATUS: CodeOption[] = [
  { code: "1", label: "Positive" },
  { code: "2", label: "Negative" },
  { code: "3", label: "Unknown" },
];

export const ART_STATUS: CodeOption[] = [
  { code: "1", label: "On ART" },
  { code: "2", label: "Not on ART" },
  { code: "3", label: "Unknown" },
];

export const ECOG: CodeOption[] = [
  { code: "0", label: "0 - Fully active" },
  { code: "1", label: "1 - Restricted strenuous activity" },
  { code: "2", label: "2 - Ambulatory >50% waking hours" },
  { code: "3", label: "3 - Limited self-care" },
  { code: "4", label: "4 - Completely disabled" },
];

export const CANCER_TYPE: CodeOption[] = [
  { code: "1", label: "Cervix" },
  { code: "2", label: "Ovary" },
  { code: "3", label: "Endometrium" },
  { code: "4", label: "Vulva" },
  { code: "5", label: "Vagina" },
  { code: "6", label: "Gestational trophoblastic disease" },
];

export const HISTOLOGY: CodeOption[] = [
  { code: "1", label: "Squamous cell carcinoma" },
  { code: "2", label: "Adenocarcinoma" },
  { code: "3", label: "Clear cell" },
  { code: "4", label: "Endometrioid" },
  { code: "5", label: "Serous" },
  { code: "6", label: "Mucinous" },
  { code: "7", label: "Other" },
];

export const GRADE: CodeOption[] = [
  { code: "1", label: "Grade 1" },
  { code: "2", label: "Grade 2" },
  { code: "3", label: "Grade 3" },
  { code: "4", label: "Unknown" },
];

export const FIGO_STAGE: CodeOption[] = [
  { code: "1", label: "IA" },
  { code: "2", label: "IB" },
  { code: "3", label: "II" },
  { code: "4", label: "IIA" },
  { code: "5", label: "IIB" },
  { code: "6", label: "III" },
  { code: "7", label: "IIIA" },
  { code: "8", label: "IIIB" },
  { code: "9", label: "IIIC" },
  { code: "10", label: "IV" },
  { code: "11", label: "IVA" },
  { code: "12", label: "IVB" },
  { code: "13", label: "Unknown" },
];

export const REFERRAL_SOURCE: CodeOption[] = [
  { code: "1", label: "Primary clinic" },
  { code: "2", label: "District hospital" },
  { code: "3", label: "Provincial hospital" },
  { code: "4", label: "Private facility" },
  { code: "5", label: "Self-referral" },
  { code: "6", label: "Other" },
];

export const SURGICAL_APPROACH: CodeOption[] = [
  { code: "1", label: "Open" },
  { code: "2", label: "Laparoscopy" },
  { code: "3", label: "Robotic" },
  { code: "4", label: "Vaginal" },
];

export const CC_SCORE: CodeOption[] = [
  { code: "0", label: "CC-0" },
  { code: "1", label: "CC-1" },
  { code: "2", label: "CC-2" },
  { code: "3", label: "CC-3" },
];

export const CHEMO_REGIMEN: CodeOption[] = [
  { code: "1", label: "Carboplatin + Paclitaxel" },
  { code: "2", label: "Cisplatin weekly" },
  { code: "3", label: "BEP" },
  { code: "4", label: "Single agent carboplatin" },
  { code: "5", label: "Other" },
];

export const CLAVIEN_DINDO: CodeOption[] = [
  { code: "1", label: "Grade I" },
  { code: "2", label: "Grade II" },
  { code: "3", label: "Grade IIIa" },
  { code: "4", label: "Grade IIIb" },
  { code: "5", label: "Grade IVa" },
  { code: "6", label: "Grade IVb" },
  { code: "7", label: "Grade V" },
];

export const DISEASE_STATUS: CodeOption[] = [
  { code: "1", label: "Disease free" },
  { code: "2", label: "Persistent disease" },
  { code: "3", label: "Progressive disease" },
  { code: "4", label: "Recurrent disease" },
];

export const RECURRENCE_SITE: CodeOption[] = [
  { code: "1", label: "Pelvis" },
  { code: "2", label: "Nodes" },
  { code: "3", label: "Liver" },
  { code: "4", label: "Lung" },
  { code: "5", label: "Bone" },
  { code: "6", label: "Brain" },
  { code: "7", label: "Peritoneum" },
  { code: "8", label: "Other" },
];

export const ALIVE_STATUS: CodeOption[] = [
  { code: "1", label: "Alive" },
  { code: "2", label: "Dead" },
  { code: "3", label: "Lost to follow-up" },
];

export const MARGIN_STATUS: CodeOption[] = [
  { code: "1", label: "Negative" },
  { code: "2", label: "Positive" },
  { code: "3", label: "Close" },
  { code: "4", label: "Unknown" },
];

export const MOLECULAR_RESULT: CodeOption[] = [
  { code: "1", label: "Positive" },
  { code: "2", label: "Negative" },
  { code: "3", label: "Not done" },
  { code: "4", label: "Unknown" },
];

export function labelFor(options: CodeOption[], code?: string | null): string {
  if (!code) return "—";
  return options.find((o) => o.code === code)?.label ?? code;
}

export function codeFromForm(value: FormDataEntryValue | null): string | undefined {
  const v = String(value ?? "").trim();
  return v === "" ? undefined : v;
}

export function boolFromForm(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}
