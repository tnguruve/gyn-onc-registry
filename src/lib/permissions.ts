import { type UserRole, USER_ROLES } from "@/lib/types";

export type Permission =
  | "patients:read"
  | "patients:create"
  | "patients:edit"
  | "patients:delete"
  | "clinical:read"
  | "clinical:write"
  | "reports:read"
  | "export:deidentified"
  | "admin:users"
  | "admin:audit"
  | "modules:manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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

function normalizeRole(role: UserRole | string): UserRole | string {
  if (typeof role !== "string") return role;
  const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : role;
}

export function hasPermission(role: UserRole | string, permission: Permission): boolean {
  const key = normalizeRole(role) as UserRole;
  return ROLE_PERMISSIONS[key]?.includes(permission) ?? false;
}

export function roleLabel(role: UserRole | string): string {
  const labels: Record<string, string> = {
    ADMIN: "Administrator",
    CLINICIAN: "Clinician",
    FRONT_DESK: "Front Desk",
    RESEARCHER: "Researcher",
  };
  return labels[role] ?? role;
}
