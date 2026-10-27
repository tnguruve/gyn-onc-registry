import { afterEach, describe, expect, it } from "vitest";
import { calcDelays, daysBetween, earliestDate, latestDate, median, rate } from "@/lib/calculations";
import { followUpQueueKeys, tumourQueueKeys } from "@/lib/clinical-queues";
import { hasPermission, type Permission } from "@/lib/permissions";
import { normalizeNationalId } from "@/lib/patient-identity";

describe("date and delay calculations", () => {
  it("calculates complete delay chains and rejects reversed dates", () => {
    const dates = {
      symptomStartDate: new Date("2026-01-01T00:00:00Z"),
      firstHealthFacilityVisit: new Date("2026-01-11T00:00:00Z"),
      referralDate: new Date("2026-01-16T00:00:00Z"),
      diagnosisDate: new Date("2026-01-21T00:00:00Z"),
      treatmentStartDate: new Date("2026-02-01T00:00:00Z"),
    };
    expect(calcDelays(dates)).toEqual({
      patientDelayDays: 10,
      healthSystemDelayDays: 5,
      diagnosisDelayDays: 20,
      treatmentDelayDays: 11,
      timeToTreatmentDays: 31,
    });
    expect(daysBetween(dates.diagnosisDate, dates.symptomStartDate)).toBeNull();
    expect(daysBetween(null, dates.diagnosisDate)).toBeNull();
  });

  it("handles summary date and rate edge cases", () => {
    const early = new Date("2025-01-01");
    const late = new Date("2025-03-01");
    expect(earliestDate([late, null, early])).toEqual(early);
    expect(latestDate([early, undefined, late])).toEqual(late);
    expect(median([5, 1, 9, 3])).toBe(4);
    expect(rate(1, 3)).toBe(33.3);
    expect(rate(0, 0)).toBeNull();
  });
});

describe("national ID normalization", () => {
  it.each([
    [" 63-123 456-A-01 ", "63123456A01"],
    ["ab cd-9", "ABCD9"],
    ["", undefined],
    [null, undefined],
  ])("normalizes %j", (input, expected) => {
    expect(normalizeNationalId(input)).toBe(expected);
  });
});

describe("RBAC matrix", () => {
  const permissions: Permission[] = [
    "patients:read", "patients:create", "patients:edit", "patients:delete",
    "clinical:read", "clinical:write", "reports:read", "export:deidentified",
    "admin:users", "admin:audit", "modules:manage",
  ];

  it("keeps each role within its expected boundary", () => {
    expect(permissions.filter((p) => hasPermission("ADMIN", p))).toEqual(permissions);
    expect(permissions.filter((p) => hasPermission("FRONT_DESK", p))).toEqual([
      "patients:read", "patients:create", "patients:edit",
    ]);
    expect(hasPermission("RESEARCHER", "reports:read")).toBe(true);
    expect(hasPermission("RESEARCHER", "patients:create")).toBe(false);
    expect(hasPermission("CLINICIAN", "clinical:write")).toBe(true);
    expect(hasPermission("consultant", "clinical:write")).toBe(true);
    expect(hasPermission("unknown", "patients:read")).toBe(false);
  });
});

describe("clinical queue membership", () => {
  afterEach(() => delete process.env.LTFU_DAYS);

  it("moves a tumour through work-up and treatment queues", () => {
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
    expect(tumourQueueKeys(base)).toEqual(["awaiting-histology"]);
    expect(tumourQueueKeys({ ...base, pathologyAvailable: true })).toEqual(["awaiting-imaging"]);
    expect(tumourQueueKeys({ ...base, pathologyAvailable: true, imagingAvailable: true })).toEqual(["ready-mdt"]);

    const mdt = {
      createdAt: new Date("2026-01-01"),
      meetingDate: new Date("2026-01-02"),
      status: "Discussed",
      recommendation: "Chemoradiation",
      implemented: false,
    };
    expect(tumourQueueKeys({ ...base, pathologyAvailable: true, imagingAvailable: true, mdts: [mdt] }))
      .toEqual(["recommendation-pending", "treatment-not-started"]);
    expect(tumourQueueKeys({ ...base, pathologyAvailable: true, imagingAvailable: true, mdts: [mdt], surgeries: [{}] }))
      .toEqual(["recommendation-pending"]);
  });

  it("detects missed follow-up and configurable potential LTFU", () => {
    process.env.LTFU_DAYS = "30";
    const now = new Date("2026-04-01T00:00:00Z");
    expect(followUpQueueKeys([
      { visitDate: new Date("2026-01-01"), nextAppointment: new Date("2026-02-01") },
    ], now)).toEqual(["missed-followup", "potential-ltfu"]);
    expect(followUpQueueKeys([], now, { lostToFollowUp: true, lostFollowUpDate: now }))
      .toEqual(["potential-ltfu"]);
  });
});
