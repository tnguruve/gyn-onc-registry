import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "./global-setup";

async function login(page: Page, role: "admin" | "front-desk" | "clinician" | "researcher") {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(`${role}@e2e.registry.local`);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

async function openFixturePatient(page: Page, expectClinicalChart = true) {
  await page.goto("/patients?q=GYN-E2E");
  await page.getByRole("link", { name: /Patient, E2E/ }).first().click();
  if (expectClinicalChart) {
    await expect(page.getByText("GYN-E2E-T1", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.getByRole("heading", { name: "Patient demographics" })).toBeVisible();
  }
}

test.describe("role journeys", () => {
  test("admin can log in and reach administration", async ({ page }) => {
    await login(page, "admin");
    await expect(page.getByRole("link", { name: "Activity log" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Module builder" })).toBeVisible();
    await page.getByRole("link", { name: "Activity log" }).click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test("front desk sees demographics only and no Research", async ({ page }) => {
    await login(page, "front-desk");
    await expect(page.getByRole("link", { name: "Research" })).toHaveCount(0);
    await openFixturePatient(page, false);
    await expect(page.getByRole("heading", { name: "Patient demographics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save demographics" })).toBeVisible();
    await expect(page.getByText("Clinical timeline")).toHaveCount(0);
    await expect(page.getByText(/Research \/ biobank/)).toHaveCount(0);
  });

  test("clinician chart exposes all instruments and supports event create/edit/delete", async ({ page }) => {
    await login(page, "clinician");
    await openFixturePatient(page);

    const instruments = [
      "Follow-up", "Edit tumour registration", "Presenting history", "Site-specific risk",
      "Treatment plan", "Complication", "New MDT preparation", "Assessment", "Pathology",
      "Imaging", "FIGO staging", "MDT", "Surgery", "Systemic", "Radiotherapy", "Lab",
      "Recurrence", "Gynaecological and obstetric history", "Medical, family and social history",
      "Referral episodes", "Patient outcome", "Module 1 — Patient demographics",
    ];
    for (const instrument of instruments) {
      await expect(page.getByText(instrument, { exact: false }).first()).toBeAttached();
    }

    await page.getByRole("button", { name: "Lab", exact: true }).click();
    const createForm = page.locator('form').filter({ has: page.getByRole("button", { name: "Save record" }) });
    await createForm.locator('[name="labDate"]').fill("2026-10-27");
    await createForm.locator('[name="labTest"]').fill("E2E marker");
    await createForm.locator('[name="labValue"]').fill("41");
    await createForm.getByRole("button", { name: "Save record" }).click();
    await expect(page.getByText("E2E marker 41")).toBeVisible({ timeout: 15_000 });

    const timelineRow = page.locator("div.grid").filter({ hasText: "E2E marker 41" }).last();
    await timelineRow.getByRole("button", { name: "Edit" }).click();
    await timelineRow.locator('[name="labValue"]').fill("42");
    await timelineRow.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("E2E marker 42")).toBeVisible({ timeout: 15_000 });

    const editedRow = page.locator("div.grid").filter({ hasText: "E2E marker 42" }).last();
    await editedRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("E2E marker 42")).toHaveCount(0, { timeout: 15_000 });
  });

  test("researcher is read-only but can export a de-identified CSV", async ({ page }) => {
    await login(page, "researcher");
    await expect(page.getByRole("link", { name: "Research" })).toBeVisible();
    await expect(page.getByText("New patient")).toHaveCount(0);
    await openFixturePatient(page);
    await expect(page.getByRole("button", { name: "Save record" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add tumour" })).toHaveCount(0);

    const response = await page.request.get("/api/export?format=csv");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("text/csv");
    const csv = await response.text();
    const header = csv.split(/\r?\n/, 1)[0].toLowerCase();
    for (const directIdentifier of [
      "registry_number", "hospital_number", "national_id", "first_name",
      "surname", "phone", "address", "date_of_birth",
    ]) {
      expect(header).not.toContain(directIdentifier);
    }
    expect(csv).not.toContain("E2E-HOSPITAL");
    expect(csv).not.toContain("Patient,E2E");
    expect(header).toContain("study_id");
    expect(header).toContain("tumour_study_id");
  });
});
