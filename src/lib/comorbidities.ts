import type { CodeOption } from "@/lib/codes";

export const CANCER_CERVIX = "1";
export const CANCER_OVARY = "2";
export const CANCER_ENDOMETRIUM = "3";
export const CANCER_VULVA = "4";
export const CANCER_VAGINA = "5";
export const CANCER_GTD = "6";

export const CHARLSON_CONDITIONS: (CodeOption & { points: number })[] = [
  { code: "mi", label: "Myocardial infarction", points: 1 },
  { code: "chf", label: "Congestive heart failure", points: 1 },
  { code: "pvd", label: "Peripheral vascular disease", points: 1 },
  { code: "cva", label: "Cerebrovascular disease", points: 1 },
  { code: "dementia", label: "Dementia", points: 1 },
  { code: "copd", label: "Chronic pulmonary disease", points: 1 },
  { code: "ctd", label: "Connective tissue disease", points: 1 },
  { code: "pud", label: "Peptic ulcer disease", points: 1 },
  { code: "liver_mild", label: "Mild liver disease", points: 1 },
  { code: "dm", label: "Diabetes without complications", points: 1 },
  { code: "hemiplegia", label: "Hemiplegia", points: 2 },
  { code: "renal", label: "Moderate/severe renal disease", points: 2 },
  { code: "dm_end", label: "Diabetes with end-organ damage", points: 2 },
  { code: "tumor", label: "Any malignancy", points: 2 },
  { code: "leukemia", label: "Leukemia", points: 2 },
  { code: "lymphoma", label: "Lymphoma", points: 2 },
  { code: "liver_severe", label: "Moderate/severe liver disease", points: 3 },
  { code: "aids", label: "AIDS", points: 6 },
];

export function parseCharlsonConditions(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function serializeCharlsonConditions(codes: string[]): string {
  return JSON.stringify(codes);
}
