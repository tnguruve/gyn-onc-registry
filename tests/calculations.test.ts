import assert from "node:assert/strict";
import test from "node:test";

import {
  calcDelays,
  calcSurvivalMetrics,
  daysBetween,
  earliestDate,
  latestDate,
  median,
  rate,
} from "../src/lib/calculations";

const utc = (value: string) => new Date(`${value}T00:00:00.000Z`);

test("date helpers calculate intervals and reject incomplete or reversed ranges", () => {
  assert.equal(daysBetween(utc("2024-02-28"), utc("2024-03-01")), 2);
  assert.equal(daysBetween(utc("2024-03-02"), utc("2024-03-01")), null);
  assert.equal(daysBetween(undefined, utc("2024-03-01")), null);

  const dates = [utc("2024-03-03"), null, utc("2024-01-01"), undefined];
  assert.equal(earliestDate(dates)?.toISOString(), utc("2024-01-01").toISOString());
  assert.equal(latestDate(dates)?.toISOString(), utc("2024-03-03").toISOString());
  assert.equal(earliestDate([null, undefined]), null);
});

test("delay calculations use the required clinical date anchors", () => {
  assert.deepEqual(
    calcDelays({
      symptomStartDate: utc("2024-01-01"),
      firstHealthFacilityVisit: utc("2024-01-11"),
      referralDate: utc("2024-01-16"),
      diagnosisDate: utc("2024-01-21"),
      treatmentStartDate: utc("2024-02-01"),
    }),
    {
      patientDelayDays: 10,
      healthSystemDelayDays: 5,
      diagnosisDelayDays: 20,
      treatmentDelayDays: 11,
      timeToTreatmentDays: 31,
    },
  );
});

test("survival calculations stop at death or recurrence", () => {
  assert.deepEqual(
    calcSurvivalMetrics({
      diagnosisDate: utc("2020-01-01"),
      recurrenceDate: utc("2021-01-01"),
      deathDate: utc("2022-01-01"),
      aliveStatus: "2",
    }),
    {
      overallSurvivalDays: 731,
      progressionFreeSurvivalDays: 366,
      diseaseFreeSurvivalDays: 366,
    },
  );
});

test("median and percentage rate handle empty, odd, even, and zero denominators", () => {
  assert.equal(median([]), null);
  assert.equal(median([9, Number.NaN, 1, 5]), 5);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(rate(1, 3), 33.3);
  assert.equal(rate(0, 0), null);
});
