import assert from "node:assert/strict";
import test from "node:test";

import { hasPermission, type Permission } from "../src/lib/permissions";
import { normalizeNationalId } from "../src/lib/patient-identity";
import { USER_ROLES, type UserRole } from "../src/lib/types";

const permissions: Permission[] = [
  "patients:read",
  "patients:create",
  "patients:edit",
  "patients:delete",
  "clinical:read",
  "clinical:write",
  "reports:read",
  "export:deidentified",
  "admin:users",
  "admin:audit",
  "modules:manage",
];

const expected: Record<UserRole, Permission[]> = {
  ADMIN: permissions,
  CLINICIAN: [
    "patients:read", "patients:create", "patients:edit", "patients:delete",
    "clinical:read", "clinical:write", "reports:read", "export:deidentified",
    "modules:manage",
  ],
  FRONT_DESK: ["patients:read", "patients:create", "patients:edit"],
  RESEARCHER: ["patients:read", "clinical:read", "reports:read", "export:deidentified"],
  MDT_COORDINATOR: [
    "patients:read", "patients:edit", "clinical:read", "clinical:write", "reports:read",
  ],
  DATA_MANAGER: [
    "patients:read", "patients:create", "patients:edit", "clinical:read",
    "reports:read", "export:deidentified",
  ],
};

test("the complete role-permission matrix grants only documented permissions", () => {
  for (const role of USER_ROLES) {
    for (const permission of permissions) {
      assert.equal(
        hasPermission(role, permission),
        expected[role].includes(permission),
        `${role} / ${permission}`,
      );
    }
  }
});

test("role aliases and formatting normalize before permission checks", () => {
  assert.equal(hasPermission("consultant", "clinical:write"), true);
  assert.equal(hasPermission("MDT coordinator", "clinical:write"), true);
  assert.equal(hasPermission("data-manager", "patients:create"), true);
  assert.equal(hasPermission("unknown-role", "patients:read"), false);
});

test("national IDs normalize case, spaces, and dashes while allowing blanks", () => {
  assert.equal(normalizeNationalId(" 63 - 111 a 42 "), "63111A42");
  assert.equal(normalizeNationalId("Ab-C d"), "ABCD");
  assert.equal(normalizeNationalId("  -  "), undefined);
  assert.equal(normalizeNationalId(null), undefined);
});
