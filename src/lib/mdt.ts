import type { Diagnosis, MdtMeeting } from "@prisma/client";

export const MDT_INITIAL_TYPE = "1";

export function hasPreTheatreMdt(
  diagnosis: Diagnosis | null | undefined,
  meetings: MdtMeeting[] | undefined,
): boolean {
  if (meetings?.some((m) => m.meetingType === MDT_INITIAL_TYPE)) return true;
  return Boolean(diagnosis?.mdtDiscussed);
}
