import assert from "node:assert/strict";
import test from "node:test";

import { buildExportRows } from "../src/lib/export-dataset";

const utc = (value: string) => new Date(`${value}T00:00:00.000Z`);
const createdAt = utc("2022-01-01");

function tumour(overrides: Record<string, unknown>) {
  return {
    id: "tumour",
    sequencePrimary: 1,
    site: "1",
    incidenceDate: utc("2022-01-05"),
    diagnosisDate: utc("2022-01-05"),
    figoStage: null,
    figoVersion: "2018",
    hivStatus: null,
    histology: null,
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
    ...overrides,
  };
}

const patient = {
  id: "patient-internal-id",
  registryNumber: "GYN-000001",
  hospitalNumber: "HOSP-SECRET",
  nationalId: "63-SECRET",
  firstName: "Direct",
  surname: "Identifier",
  dateOfBirth: utc("1980-06-15"),
  address: "1 Secret Street",
  phone: "0770000000",
  nextOfKin: "Secret Relative",
  nokPhone: "0710000000",
  sexAtBirth: "F",
  residenceType: "Urban",
  country: "ZW",
  province: "1",
  district: "2",
  maritalStatus: "1",
  educationLevel: "3",
  hivStatus: "1",
  artStatus: "1",
  cd4Count: 450,
  ecog: "0",
  heightCm: 165,
  weightKg: 60,
  bmi: 22,
  charlsonConditions: "[]",
  referral: {
    referralDate: utc("2022-01-01"),
    dateSeenAtCancerCenter: utc("2022-01-03"),
    referralSource: "District hospital",
    referralLevel: "Secondary",
  },
  referralEpisodes: [],
  followUps: [{ visitDate: utc("2024-01-01"), nextAppointment: utc("2024-04-01") }],
  medicalHistory: null,
  patientOutcome: {
    vitalStatus: "Alive",
    deathDate: null,
    lastContactDate: utc("2024-01-01"),
    lostToFollowUp: true,
    lostFollowUpDate: utc("2024-04-01"),
  },
  research: {
    consentForResearch: true,
    consentForGenetics: false,
    tissueBank: true,
    bloodSamples: false,
  },
  tumours: [
    tumour({
      id: "cervix",
      sequencePrimary: 1,
      site: "1",
      hivStatus: "1",
      pathology: [{
        reportDate: utc("2022-01-06"),
        specimenDate: utc("2022-01-04"),
        createdAt,
        histology: "Squamous cell carcinoma",
        grade: "2",
        icdoMorphology: "8070/3",
      }],
      stagings: [{
        stagingDate: utc("2022-01-07"),
        finalStage: "9",
        stage: "9",
        version: "2018",
      }],
      mdts: [{
        meetingDate: utc("2022-01-11"),
        createdAt,
        recommendation: "Radical hysterectomy",
        decision: null,
        implemented: true,
        implementationDate: utc("2022-01-21"),
        reasonNotImplemented: null,
      }],
      surgeries: [{
        id: "surgery-1",
        surgeryDate: utc("2022-01-21"),
        createdAt,
        procedure: "Radical hysterectomy",
        intent: "Curative",
        residualDisease: "R0",
        ccScore: null,
        complication: "Bleeding",
        intraopComplication: null,
        postopComplication: null,
        mortality30d: false,
        mortality90d: false,
      }],
      complications: [{
        linkedProcedure: "surgery-1",
        mortality30Day: false,
        mortality90Day: false,
      }],
      outcomes: [{
        statusDate: utc("2024-01-01"),
        lastContactDate: utc("2024-01-01"),
        deathDate: null,
        vitalStatus: "Alive",
        lostToFollowUp: false,
        lostFollowUpDate: null,
      }],
    }),
    tumour({
      id: "ovary",
      sequencePrimary: 2,
      site: "3",
      figoStage: "III",
      pathology: [],
      systemicTherapies: [{
        therapyDate: utc("2022-02-01"),
        createdAt,
        intent: "Neoadjuvant",
        therapyType: "Chemotherapy",
        regimen: "Carboplatin/paclitaxel",
        response: "PR",
      }],
      surgeries: [{
        id: "surgery-2",
        surgeryDate: utc("2022-05-01"),
        createdAt,
        procedure: "Interval debulking",
        intent: "Curative",
        residualDisease: "R0",
        ccScore: "0",
        complication: null,
        intraopComplication: null,
        postopComplication: null,
        mortality30d: false,
        mortality90d: false,
      }],
      outcomes: [{
        statusDate: utc("2024-01-01"),
        lastContactDate: utc("2024-01-01"),
        deathDate: utc("2024-01-01"),
        vitalStatus: "Dead",
        lostToFollowUp: false,
        lostFollowUpDate: null,
      }],
      recurrences: [{ recurrenceDate: utc("2023-01-05") }],
    }),
    tumour({
      id: "endometrium",
      sequencePrimary: 3,
      site: "2",
      figoStage: "IA",
      pathology: [{
        reportDate: utc("2022-01-08"),
        specimenDate: utc("2022-01-07"),
        createdAt,
        histology: "Endometrioid adenocarcinoma",
        grade: "1",
        icdoMorphology: "8380/3",
      }],
    }),
  ],
};

test("research export emits one de-identified analytic row per tumour", () => {
  const rows = buildExportRows([patient] as never);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.tumour_study_id), [
    "SUBJ-0001-T1",
    "SUBJ-0001-T2",
    "SUBJ-0001-T3",
  ]);
  assert.ok(rows.every((row) => row.study_id === "SUBJ-0001"));
  assert.ok(rows.every((row) => row.tumour_count === 3));

  const forbiddenKeys = [
    "id", "registryNumber", "hospitalNumber", "nationalId", "firstName",
    "surname", "dateOfBirth", "address", "phone", "nextOfKin", "nokPhone",
  ];
  for (const row of rows) {
    for (const key of forbiddenKeys) assert.equal(key in row, false, key);
    assert.ok(!Object.values(row).includes("HOSP-SECRET"));
    assert.ok(!Object.values(row).includes("63-SECRET"));
    assert.ok(!Object.values(row).includes("Direct"));
    assert.ok(!Object.values(row).includes("Identifier"));
  }
});

test("exported analytic structures cover RQ1 through RQ10 inputs and outputs", () => {
  const [cervix, ovary, endometrium] = buildExportRows([patient] as never);

  // RQ1: annual stage IIIC cervix; RQ2: HIV prevalence.
  assert.equal(cervix.stage_iiic_cervix, 1);
  assert.equal(cervix.treatment_start_year, 2022);
  assert.equal(cervix.hiv_status_code, "1");

  // RQ3 and RQ4: referral/pathology timing.
  assert.equal(cervix.referral_to_mdt_days, 10);
  assert.equal(cervix.pathology_report_to_treatment_days, 15);

  // RQ5: implemented MDT recommendations.
  assert.equal(cervix.documented_mdt_recommendation_count, 1);
  assert.equal(cervix.implemented_mdt_recommendation_count, 1);

  // RQ6: advanced ovarian strategy, mortality, recurrence, and follow-up.
  assert.equal(ovary.advanced_ovarian, 1);
  assert.equal(ovary.ovarian_initial_strategy, "NACT");
  assert.equal(ovary.overall_survival_event, 1);
  assert.equal(ovary.recurrence_date, "2023-01-05");
  assert.equal(typeof ovary.overall_survival_days, "number");

  // RQ7: loss to follow-up and predictor fields.
  assert.equal(cervix.lost_to_follow_up, 1);
  assert.equal(cervix.ltfu_predictor_province, "1");
  assert.equal(cervix.ltfu_predictor_stage, "9");

  // RQ8: radical hysterectomy complications.
  assert.equal(cervix.radical_hysterectomy_count, 1);
  assert.equal(cervix.radical_hysterectomy_complication_count, 1);

  // RQ9: FIGO-stratified survival observation fields.
  assert.equal(cervix.figo_stage_code, "9");
  assert.equal(cervix.overall_survival_censored, 1);
  assert.equal(typeof cervix.overall_survival_days, "number");

  // RQ10: endometrial histology distribution.
  assert.equal(endometrium.primary_site_code, "2");
  assert.equal(endometrium.histology, "Endometrioid adenocarcinoma");
});

test("district can be omitted when quasi-identifiers are not approved", () => {
  const rows = buildExportRows([patient] as never, { omitDistrict: true });
  assert.ok(rows.every((row) => !("district_code" in row)));
});
