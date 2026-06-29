export const USER_ROLES = ["ADMIN", "CLINICIAN", "FRONT_DESK", "RESEARCHER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SEX_OPTIONS = ["FEMALE", "MALE", "OTHER", "UNKNOWN"] as const;
export type Sex = (typeof SEX_OPTIONS)[number];

export const PATIENT_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "DECEASED",
  "LOST_TO_FOLLOW_UP",
] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
