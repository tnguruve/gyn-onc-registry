import { prisma } from "@/lib/db";
import { formatRegistryDisplay } from "@/lib/patient-workflow";
import { labelFor, PRIMARY_SITE } from "@/lib/codes";

export type QueueKey =
  | "awaiting-histology"
  | "awaiting-imaging"
  | "ready-mdt"
  | "booked-mdt"
  | "recommendation-pending"
  | "treatment-not-started"
  | "missed-followup"
  | "potential-ltfu";

export const QUEUE_LABELS: Record<QueueKey, string> = {
  "awaiting-histology": "Awaiting histology",
  "awaiting-imaging": "Awaiting imaging",
  "ready-mdt": "Ready for MDT",
  "booked-mdt": "Booked for MDT",
  "recommendation-pending": "Recommendation not implemented",
  "treatment-not-started": "Treatment not started",
  "missed-followup": "Missed follow-up",
  "potential-ltfu": "Potential LTFU",
};

const MS_DAY = 86_400_000;

export function ltfuDays(): number {
  const n = Number(process.env.LTFU_DAYS ?? 90);
  return Number.isFinite(n) && n > 0 ? n : 90;
}

type QueueItem = {
  queue: QueueKey;
  patientId: string;
  registryId: string;
  name: string;
  tumourId?: string;
  tumourCode?: string;
  site?: string;
  detail: string;
};

function latest<T extends { createdAt: Date }>(xs: T[]): T | undefined {
  return [...xs].sort((a, b) => +b.createdAt - +a.createdAt)[0];
}

export function tumourQueueKeys(t: {
  pathologyAvailable: boolean;
  imagingAvailable: boolean;
  mdtStatus: string;
  figoStage: string | null;
  mdts: {
    createdAt: Date;
    meetingDate: Date | null;
    status?: string | null;
    recommendation: string | null;
    implemented: boolean | null;
  }[];
  surgeries: unknown[];
  systemicTherapies: unknown[];
  radiotherapies: unknown[];
  pathology?: { histology: string | null; reportDate: Date | null }[];
  imaging?: { imagingDate: Date | null; impression: string | null; reportText: string | null }[];
  mdtPreparations?: {
    createdAt: Date;
    status: string | null;
    scheduledDate: Date | null;
    histologyAvailable: boolean;
    imagingAvailable: boolean;
    ready?: boolean;
  }[];
}): QueueKey[] {
  const q: QueueKey[] = [];
  const m = latest(t.mdts);
  const prep = latest(t.mdtPreparations ?? []);
  const pathologyAvailable =
    (t.pathology?.length
      ? t.pathology.some((row) => Boolean(row.histology || row.reportDate))
      : prep?.histologyAvailable) ?? t.pathologyAvailable;
  const imagingAvailable =
    (t.imaging?.length
      ? t.imaging.some((row) => Boolean(row.imagingDate || row.impression || row.reportText))
      : prep?.imagingAvailable) ?? t.imagingAvailable;
  const mdtStatus = m?.status ?? prep?.status ?? t.mdtStatus;
  const hasTx =
    t.surgeries.length + t.systemicTherapies.length + t.radiotherapies.length > 0;
  if (!pathologyAvailable) q.push("awaiting-histology");
  if (pathologyAvailable && !imagingAvailable) q.push("awaiting-imaging");
  if (
    pathologyAvailable &&
    imagingAvailable &&
    (prep?.ready !== false || !prep) &&
    !["Booked", "Discussed", "Recommendation documented", "Treatment initiated"].includes(mdtStatus)
  ) {
    q.push("ready-mdt");
  }
  if (mdtStatus === "Booked") q.push("booked-mdt");
  if (m?.recommendation && m.implemented !== true) q.push("recommendation-pending");
  if (m?.recommendation && !hasTx && m.implemented !== true) q.push("treatment-not-started");
  return q;
}

export function followUpQueueKeys(
  followUps: { followUpDate?: Date; visitDate?: Date; nextAppointment: Date | null }[],
  now = new Date(),
  outcome?: { lostToFollowUp: boolean; lostFollowUpDate: Date | null },
): QueueKey[] {
  const q: QueueKey[] = [];
  const last = [...followUps].sort((a, b) => {
    const da = +(a.followUpDate ?? a.visitDate ?? 0);
    const db = +(b.followUpDate ?? b.visitDate ?? 0);
    return db - da;
  })[0];
  if (last?.nextAppointment && +last.nextAppointment < +now) {
    q.push("missed-followup");
    if ((+now - +last.nextAppointment) / MS_DAY >= ltfuDays()) q.push("potential-ltfu");
  }
  if (outcome?.lostToFollowUp && !q.includes("potential-ltfu")) q.push("potential-ltfu");
  return q;
}

export const TUMOUR_INCLUDE = {
  mdts: true,
  mdtPreparations: true,
  surgeries: true,
  systemicTherapies: true,
  radiotherapies: true,
  pathology: true,
  imaging: true,
  assessments: true,
  stagings: true,
  recurrences: true,
  outcomes: true,
  labs: true,
  presenting: true,
  riskFactor: true,
  treatmentPlans: true,
  complications: true,
} as const;

export async function loadOperationsBoard() {
  const withTumours = () =>
    prisma.patient.findMany({
      include: {
        tumours: { include: TUMOUR_INCLUDE },
        followUps: true,
        diagnosis: true,
        patientOutcome: true,
      },
      orderBy: { updatedAt: "desc" as const },
    });
  const patients = await withTumours().catch(async () => {
    const fallback = await prisma.patient.findMany({
      include: { followUps: true, diagnosis: true, patientOutcome: true },
      orderBy: { updatedAt: "desc" },
    });
    return fallback.map((p) => ({ ...p, tumours: [] as never[] }));
  });

  const items: QueueItem[] = [];
  for (const p of patients) {
    const registryId = formatRegistryDisplay(p.registryNumber);
    const name = `${p.firstName} ${p.surname}`;
    for (const t of p.tumours) {
      for (const queue of tumourQueueKeys(t)) {
        const m = latest(t.mdts);
        const prep = latest(t.mdtPreparations);
        let detail = t.figoStage ? `FIGO ${t.figoStage}` : t.mdtStatus;
        const meetingDate = m?.meetingDate ?? prep?.scheduledDate;
        if (queue === "booked-mdt" && meetingDate) {
          detail = `MDT ${meetingDate.toLocaleDateString("en-GB", { timeZone: "UTC" })}`;
        }
        items.push({
          queue,
          patientId: p.id,
          registryId,
          name,
          tumourId: t.id,
          tumourCode: t.tumourCode,
          site: labelFor(PRIMARY_SITE, t.site) || t.site,
          detail,
        });
      }
    }
    const tumourLtfu = p.tumours
      .flatMap((tumour) => tumour.outcomes)
      .filter((outcome) => outcome.lostToFollowUp)
      .sort((a, b) => +b.statusDate - +a.statusDate)[0];
    const followUpOutcome = p.patientOutcome ?? (tumourLtfu
      ? { lostToFollowUp: true, lostFollowUpDate: tumourLtfu.lostFollowUpDate }
      : undefined);
    for (const queue of followUpQueueKeys(p.followUps, new Date(), followUpOutcome)) {
      const last = [...p.followUps].sort((a, b) => +b.visitDate - +a.visitDate)[0];
      items.push({
        queue,
        patientId: p.id,
        registryId,
        name,
        site: "Follow-up",
        detail: followUpOutcome?.lostToFollowUp
          ? `Recorded LTFU${followUpOutcome.lostFollowUpDate ? ` ${followUpOutcome.lostFollowUpDate.toLocaleDateString("en-GB", { timeZone: "UTC" })}` : ""}`
          : last?.nextAppointment
          ? `Due ${last.nextAppointment.toLocaleDateString("en-GB", { timeZone: "UTC" })}`
          : "Follow-up overdue",
      });
    }
  }

  const keys = Object.keys(QUEUE_LABELS) as QueueKey[];
  const queues = keys.map((key) => ({
    key,
    label: QUEUE_LABELS[key],
    count: items.filter((i) => i.queue === key).length,
    items: items.filter((i) => i.queue === key).slice(0, 12),
  }));

  return {
    registered: patients.length,
    readyMdt: queues.find((q) => q.key === "ready-mdt")?.count ?? 0,
    treatmentPending: queues.find((q) => q.key === "treatment-not-started")?.count ?? 0,
    missedFollowup: queues.find((q) => q.key === "missed-followup")?.count ?? 0,
    ltfuDays: ltfuDays(),
    queues,
    patientsBadge:
      (queues.find((q) => q.key === "ready-mdt")?.count ?? 0) +
      (queues.find((q) => q.key === "missed-followup")?.count ?? 0),
  };
}
