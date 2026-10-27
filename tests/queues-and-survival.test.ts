import assert from "node:assert/strict";
import test from "node:test";

import {
  followUpQueueKeys,
  tumourQueueKeys,
} from "../src/lib/clinical-queues";
import {
  buildSurvivalCurve,
  survivalAt,
} from "../src/lib/kaplan-meier";

const utc = (value: string) => new Date(`${value}T00:00:00.000Z`);

test("tumour queues derive work-up, MDT, recommendation, and treatment states", () => {
  const base = {
    pathologyAvailable: false,
    imagingAvailable: false,
    mdtStatus: "Not ready",
    figoStage: null,
    mdts: [],
    surgeries: [],
    systemicTherapies: [],
    radiotherapies: [],
  };
  assert.deepEqual(tumourQueueKeys(base), ["awaiting-histology"]);
  assert.deepEqual(tumourQueueKeys({ ...base, pathologyAvailable: true }), ["awaiting-imaging"]);
  assert.deepEqual(
    tumourQueueKeys({ ...base, pathologyAvailable: true, imagingAvailable: true }),
    ["ready-mdt"],
  );

  const recommendation = {
    createdAt: utc("2024-01-01"),
    meetingDate: utc("2024-01-01"),
    status: "Discussed",
    recommendation: "Chemoradiation",
    implemented: false,
  };
  assert.deepEqual(
    tumourQueueKeys({
      ...base,
      pathologyAvailable: true,
      imagingAvailable: true,
      mdts: [recommendation],
    }),
    ["recommendation-pending", "treatment-not-started"],
  );
});

test("tumour-less patient follow-up still derives missed and potential-LTFU queues", () => {
  const followUps = [{
    visitDate: utc("2024-01-01"),
    nextAppointment: utc("2024-02-01"),
  }];
  assert.deepEqual(
    followUpQueueKeys(followUps, utc("2024-05-15")),
    ["missed-followup", "potential-ltfu"],
  );
  assert.deepEqual(
    followUpQueueKeys([], utc("2024-05-15"), {
      lostToFollowUp: true,
      lostFollowUpDate: utc("2024-04-01"),
    }),
    ["potential-ltfu"],
  );
});

test("FIGO five-year survival uses the last Kaplan-Meier estimate at or before five years", () => {
  const fiveYears = 5 * 365.25;
  const curve = buildSurvivalCurve("FIGO IIIC", [
    { timeDays: 365, event: true },
    { timeDays: 730, event: false },
    { timeDays: 1_500, event: true },
    { timeDays: 2_000, event: false },
  ]);

  assert.equal(curve.insufficient, false);
  assert.equal(curve.n, 4);
  assert.equal(curve.events, 2);
  assert.equal(survivalAt(curve, fiveYears), 0.375);
  assert.equal(survivalAt(curve, 300), 1);
});

test("five-year survival remains unavailable for an insufficient FIGO cohort", () => {
  const curve = buildSurvivalCurve("FIGO IV", [
    { timeDays: 2_000, event: false },
    { timeDays: 500, event: true },
  ]);
  assert.equal(curve.insufficient, true);
  assert.equal(survivalAt(curve, 5 * 365.25), null);
});
