import type { ExportRow } from "@/lib/export-dataset";

export type MissingnessRow = {
  variable: string;
  label: string;
  filled: number;
  missing: number;
  percent: number;
};

const VARIABLE_LABELS: Record<string, string> = {
  age_years: "Age (years)",
  province_code: "Province",
  hiv_status_code: "HIV status",
  ecog_code: "ECOG",
  charlson_index: "Charlson index",
  diagnosis_date: "Diagnosis date",
  treatment_start_date: "Treatment start date",
  cancer_type_code: "Cancer type",
  histology_code: "Histology",
  grade_code: "Grade",
  figo_stage_code: "FIGO stage",
  diagnosis_delay_days: "Diagnosis delay (days)",
  treatment_delay_days: "Treatment delay (days)",
  surgery_count: "Surgery recorded",
  nodes_removed: "Nodes removed",
  positive_nodes: "Positive nodes",
  lvsi: "LVSI",
  ca125: "CA-125",
  chemo_regimen_code: "Chemotherapy regimen",
  overall_survival_days: "Overall survival (days)",
  consent_research: "Research consent",
  tissue_bank: "Tissue bank",
  follow_up_visits: "Follow-up visits",
};

const KEY_VARIABLES = Object.keys(VARIABLE_LABELS);

function isFilled(value: string | number | undefined): boolean {
  if (value === "" || value === undefined || value === null) return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  return true;
}

export function buildMissingnessTable(rows: ExportRow[]): MissingnessRow[] {
  const n = rows.length || 1;

  return KEY_VARIABLES.map((variable) => {
    const filled = rows.filter((r) => isFilled(r[variable])).length;
    const missing = rows.length - filled;
    return {
      variable,
      label: VARIABLE_LABELS[variable] ?? variable,
      filled,
      missing,
      percent: rows.length === 0 ? 0 : Math.round((filled / n) * 100),
    };
  }).sort((a, b) => a.percent - b.percent);
}
