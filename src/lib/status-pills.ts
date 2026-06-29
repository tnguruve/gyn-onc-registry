import type { WorkflowStatus } from "@/lib/patient-workflow";

export const STATUS_PILL: Record<
  WorkflowStatus,
  { label: string; bg: string; text: string }
> = {
  DRAFT: { label: "Draft", bg: "#F4F0E8", text: "#8A7E66" },
  IN_TREATMENT: { label: "In treatment", bg: "#FBEFD9", text: "#9A6B17" },
  MDT_PENDING: { label: "MDT pending", bg: "#F3E9EF", text: "#7A3B5E" },
  FOLLOW_UP: { label: "Follow-up", bg: "#E7F1EE", text: "#0C5C4E" },
  SURVEILLANCE: { label: "Surveillance", bg: "#EAF0F6", text: "#3A5A8A" },
  SURGERY_BOOKED: { label: "Surgery booked", bg: "#FBEAEC", text: "#B23A48" },
};

export function statusPill(status: string) {
  return STATUS_PILL[status as WorkflowStatus] ?? STATUS_PILL.DRAFT;
}
