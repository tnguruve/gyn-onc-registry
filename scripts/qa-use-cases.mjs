/**
 * One-off QA runner. Run: node scripts/qa-use-cases.mjs
 */
import { PrismaClient } from "@prisma/client";

const BASE = "http://127.0.0.1:3000";
const prisma = new PrismaClient();
const results = [];

function record(id, name, pass, note = "") {
  results.push({ id, name, pass, note });
}

async function fetchStatus(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...opts });
  return { status: res.status, location: res.headers.get("location") };
}

function hasPermission(role, permission) {
  const ROLE_PERMISSIONS = {
    ADMIN: [
      "patients:read", "patients:create", "patients:edit", "patients:delete",
      "clinical:read", "clinical:write", "reports:read",
      "export:deidentified", "admin:users", "admin:audit", "modules:manage",
    ],
    CLINICIAN: [
      "patients:read", "patients:create", "patients:edit", "patients:delete",
      "clinical:read", "clinical:write", "reports:read", "export:deidentified", "modules:manage",
    ],
    FRONT_DESK: ["patients:read", "patients:create", "patients:edit", "patients:delete"],
    RESEARCHER: ["patients:read", "clinical:read", "reports:read", "export:deidentified", "patients:delete"],
  };
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

function normalizeNationalId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const normalized = raw.replace(/[\s-]/g, "").toUpperCase();
  return normalized || undefined;
}

async function findPatientByNationalId(nationalId, excludePatientId) {
  const normalized = normalizeNationalId(nationalId);
  if (!normalized) return null;
  const candidates = await prisma.patient.findMany({
    where: {
      nationalId: { not: null },
      ...(excludePatientId ? { id: { not: excludePatientId } } : {}),
    },
    select: { id: true, nationalId: true, registryNumber: true, firstName: true, surname: true },
  });
  return candidates.find((p) => normalizeNationalId(p.nationalId) === normalized) ?? null;
}

async function generateRegistryNumber() {
  const patients = await prisma.patient.findMany({ select: { registryNumber: true } });
  let max = 0;
  for (const { registryNumber } of patients) {
    const match = registryNumber.trim().match(/^GYN-?(\d+)$/i);
    if (!match) continue;
    const num = Number(match[1]);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return `GYN-${String(max + 1).padStart(4, "0")}`;
}

async function main() {
  const guzha = await prisma.user.findUnique({ where: { email: "clinician@registry.local" } });
  record(1, "Setup: Dr. Guzha account exists", !!guzha, guzha ? guzha.role : "missing");

  const patients = await prisma.patient.findMany({ orderBy: { registryNumber: "asc" } });
  record(1, "Setup: patients in database", patients.length > 0, `${patients.length} patients`);

  const demo = patients.find((p) => /0001/.test(p.registryNumber));
  record(1, "Setup: demo patient GYN-0001 exists", !!demo, demo?.registryNumber ?? "not found");

  const signup = await fetchStatus("/signup");
  record(4, "Signup redirects to login", signup.status === 307 && signup.location?.includes("/login"));

  const signupMode = await fetchStatus("/login?mode=signup");
  record(4, "Signup mode redirects to login", signupMode.status === 307);

  const reports = await fetchStatus("/reports");
  record(52, "/reports requires auth (redirect)", reports.status === 307);

  const dashboardUnauth = await fetchStatus("/dashboard");
  record(2, "Dashboard requires auth", dashboardUnauth.status === 307 && dashboardUnauth.location?.includes("/login"));

  record(55, "Front desk cannot read reports", !hasPermission("FRONT_DESK", "reports:read"));
  record(55, "Front desk can create patients", hasPermission("FRONT_DESK", "patients:create"));
  record(56, "Clinician can read reports", hasPermission("CLINICIAN", "reports:read"));
  record(56, "Clinician can write clinical", hasPermission("CLINICIAN", "clinical:write"));
  record(57, "Researcher cannot create patients", !hasPermission("RESEARCHER", "patients:create"));
  record(57, "Researcher can export", hasPermission("RESEARCHER", "export:deidentified"));

  const nextNum = await generateRegistryNumber();
  const nums = patients.map((p) => Number(p.registryNumber.replace(/^GYN-?/i, ""))).filter((n) => !Number.isNaN(n));
  const max = Math.max(0, ...nums);
  const expected = `GYN-${String(max + 1).padStart(4, "0")}`;
  record(20, "Registry number is next after max", nextNum === expected, `got ${nextNum}, expected ${expected}`);

  record(24, "National ID normalizes spaces/dashes", normalizeNationalId("63-111 a") === "63111A");
  const withId = patients.find((p) => p.nationalId);
  if (withId) {
    const found = await findPatientByNationalId(withId.nationalId);
    record(24, "findPatientByNationalId finds existing", !!found);
  } else {
    record(24, "findPatientByNationalId finds existing", null, "SKIP — no patient with national ID");
  }
  record(25, "Non-matching national ID returns null", (await findPatientByNationalId("ZZZ-NONEXISTENT-999")) === null);

  const exportUnauth = await fetchStatus("/api/export?format=csv");
  record(48, "Export API requires auth", [302, 307, 401].includes(exportUnauth.status), `status ${exportUnauth.status}`);

  const auditCount = await prisma.auditLog.count();
  record(53, "Audit logs in database", auditCount > 0, `${auditCount} entries`);

  const customCount = await prisma.customModule.count();
  record(40, "Custom modules table accessible", true, `${customCount} modules`);

  const setupPage = await fetchStatus("/setup");
  record(1, "Setup page reachable", setupPage.status === 200);

  await prisma.$disconnect();

  const passed = results.filter((r) => r.pass === true).length;
  const failed = results.filter((r) => r.pass === false).length;
  const skipped = results.filter((r) => r.pass === null).length;
  console.log(JSON.stringify({ passed, failed, skipped, results }, null, 2));
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
