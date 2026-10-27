import { describe, expect, it } from "vitest";
import { buildExportRows } from "@/lib/export-dataset";

const d = (value: string) => new Date(`${value}T00:00:00Z`);

function tumour(sequencePrimary: number, site = "1") {
  return {
    id: `tumour-${sequencePrimary}`,
    sequencePrimary,
    site,
    diagnosisDate: d(`202${sequencePrimary}-01-10`),
    incidenceDate: null,
    hivStatus: null,
    histology: "Squamous cell carcinoma",
    figoStage: sequencePrimary === 1 ? "9" : "2",
    figoVersion: "2018",
    tumourGrade: null,
    icdoTopography: null,
    icdoMorphology: null,
    icdoBehaviour: null,
    basisDiagnosis: null,
    pathology: [],
    imaging: [],
    stagings: [],
    mdts: [],
    treatmentPlans: [],
    surgeries: [],
    systemicTherapies: [],
    radiotherapies: [],
    complications: [],
    recurrences: [],
    outcomes: [],
  };
}

function patient(tumours = [tumour(1), tumour(2, "3")]) {
  return {
    id: "patient-secret-id",
    registryNumber: "GYN-SECRET",
    hospitalNumber: "H-SECRET",
    nationalId: "63-SECRET",
    firstName: "Fictional",
    surname: "Patient",
    phone: "+263700000000",
    address: "Private address",
    dateOfBirth: d("1980-06-15"),
    sexAtBirth: "2",
    residenceType: "1",
    country: "Zimbabwe",
    province: "2",
    district: "Harare",
    maritalStatus: "1",
    educationLevel: "3",
    hivStatus: "2",
    artStatus: null,
    cd4Count: null,
    ecog: null,
    heightCm: null,
    weightKg: null,
    bmi: null,
    charlsonConditions: "[]",
    referral: null,
    referralEpisodes: [],
    followUps: [],
    medicalHistory: null,
    patientOutcome: null,
    research: null,
    tumours,
  } as never;
}

describe("de-identified tumour-level export", () => {
  it("emits exactly one row per tumour and preserves multi-tumour linkage", () => {
    const rows = buildExportRows([patient()]);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.study_id)).toEqual(["SUBJ-0001", "SUBJ-0001"]);
    expect(rows.map((row) => row.tumour_study_id)).toEqual(["SUBJ-0001-T1", "SUBJ-0001-T2"]);
    expect(rows.map((row) => row.tumour_sequence)).toEqual([1, 2]);
    expect(rows.every((row) => row.tumour_count === 2)).toBe(true);
    expect(rows.map((row) => row.primary_site_code)).toEqual(["1", "3"]);
  });

  it("excludes direct identifiers and optionally district", () => {
    const [row] = buildExportRows([patient([tumour(1)])], { omitDistrict: true });
    const forbidden = [
      "id", "patient_id", "registry_number", "hospital_number", "national_id",
      "first_name", "surname", "name", "phone", "address", "date_of_birth",
      "district_code",
    ];
    expect(forbidden.filter((key) => key in row)).toEqual([]);
    expect(JSON.stringify(row)).not.toContain("SECRET");
    expect(row.study_id).toBe("SUBJ-0001");
  });
});
