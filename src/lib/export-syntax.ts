import {
  ALIVE_STATUS,
  CANCER_TYPE,
  CHEMO_REGIMEN,
  ECOG,
  FIGO_STAGE,
  GRADE,
  HISTOLOGY,
  HIV_STATUS,
  MARITAL_STATUS,
  PROVINCES,
  type CodeOption,
} from "@/lib/codes";
import type { ExportRow } from "@/lib/export-dataset";

const CODED_FIELDS: { field: string; codes: CodeOption[] }[] = [
  { field: "province_code", codes: PROVINCES },
  { field: "marital_status_code", codes: MARITAL_STATUS },
  { field: "hiv_status_code", codes: HIV_STATUS },
  { field: "ecog_code", codes: ECOG },
  { field: "cancer_type_code", codes: CANCER_TYPE },
  { field: "histology_code", codes: HISTOLOGY },
  { field: "grade_code", codes: GRADE },
  { field: "figo_stage_code", codes: FIGO_STAGE },
  { field: "chemo_regimen_code", codes: CHEMO_REGIMEN },
  { field: "alive_status_code", codes: ALIVE_STATUS },
];

function csvFilename() {
  return `zimbabwe-gynonc-export-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function buildSpssSyntax(rows: ExportRow[]): string {
  const file = csvFilename();
  const numericFields = new Set(
    rows.length === 0
      ? []
      : Object.keys(rows[0]).filter((key) => rows.some((row) => typeof row[key] === "number")),
  );
  const lines = [
    "* Zimbabwe Gyn Onc Registry — SPSS import syntax.",
    "* 1. Download the CSV from the same export session.",
    "* 2. Save CSV next to this .sps file and update the path below if needed.",
    "",
    `GET DATA /TYPE=TXT /FILE='${file}' /DELIMITERS="," /QUALIFIER='"' /ARRANGEMENT=DELIMITED /FIRSTCASE=2 /VARIABLES=`,
  ];

  if (rows.length > 0) {
    const vars = Object.keys(rows[0]).map((key) => {
      return `  ${key} ${numericFields.has(key) ? "F12.2" : "A255"}`;
    });
    lines.push(vars.join("\n") + ".");
  }

  lines.push("CACHE.", "EXECUTE.", "");

  for (const { field, codes } of CODED_FIELDS) {
    if (rows.length === 0 || !(field in rows[0])) continue;
    const labels = codes.map((c) =>
      `  ${numericFields.has(field) ? c.code : `'${c.code}'`} '${c.label.replace(/'/g, "''")}'`
    ).join("\n");
    lines.push(`VALUE LABELS ${field}`, labels + ".", "");
  }

  lines.push("EXECUTE.");
  return lines.join("\n");
}

export function buildStataSyntax(rows: ExportRow[]): string {
  void rows;
  const file = csvFilename();
  const lines = [
    "* Zimbabwe Gyn Onc Registry — Stata import do-file",
    "* 1. Download the CSV from the same export session.",
    "* 2. cd to the folder containing the CSV, then: do import_gynonc.do",
    "",
    `import delimited "${file}", clear bindquote(strict) case(preserve)`,
    "",
  ];

  for (const { field, codes } of CODED_FIELDS) {
    if (rows.length === 0 || !(field in rows[0])) continue;
    const valueLines = codes.map((c) => `  ${c.code} "${c.label.replace(/"/g, '\\"')}"`).join("\n");
    lines.push(`label define ${field}_lbl`, valueLines, `label values ${field} ${field}_lbl`, "");
  }

  lines.push('label variable study_id "De-identified study ID"');
  lines.push('label variable overall_survival_days "Overall survival (days from diagnosis)"');
  lines.push('label variable pathology_report_to_treatment_days "Pathology report to first treatment (days)"');
  return lines.join("\n");
}
