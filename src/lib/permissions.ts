import { type UserRole } from "@/lib/types";

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
    "clinical:read", "clinical:write", "reports:read", "modules:manage",
  ],
  FRONT_DESK: ["patients:read", "patients:create", "patients:edit", "patients:delete"],
  RESEARCHER: ["patients:read", "clinical:read", "reports:read", "export:deidentified", "patients:delete"],
};

export function hasPermission(role: UserRole | string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role as UserRole]?.includes(permission) ?? false;
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
