import { prisma } from "@/lib/db";
import { CANCER_TYPE, labelFor } from "@/lib/codes";
import { calcAge } from "@/lib/calculations";
import {
  computeWorkflowStatus,
  formatRegistryDisplay,
  isFollowUpOverdue,
  patientInitials,
  type WorkflowStatus,
} from "@/lib/patient-workflow";

const CANCER_LABELS: Record<string, string> = {
  "1": "Cervical",
  "2": "Ovarian",
  "3": "Endometrial",
  "4": "Vulval / Vaginal",
  "5": "Vulval / Vaginal",
  "6": "GTD",
  "7": "GTN",
};

const CANCER_COLORS: Record<string, string> = {
  "1": "#0C4F4E",
  "2": "#14807E",
  "3": "#7A3B5E",
  "4": "#C98AAE",
  "5": "#C98AAE",
  "6": "#D8B23A",
  "7": "#B8860B",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type DashboardPatient = Awaited<ReturnType<typeof loadDashboardPatients>>[number];

export async function loadDashboardPatients() {
  return prisma.patient.findMany({
    include: {
      referral: true,
      diagnosis: true,
      mdtMeetings: true,
      surgeries: true,
      followUps: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function enrichPatient(patient: DashboardPatient) {
  const status = computeWorkflowStatus(patient);
  return {
    ...patient,
    workflowStatus: status,
    initials: patientInitials(patient.firstName, patient.surname),
    displayId: formatRegistryDisplay(patient.registryNumber),
    diagnosisLabel: labelFor(CANCER_TYPE, patient.diagnosis?.cancerType) || "—",
    age: calcAge(patient.dateOfBirth),
    followUpOverdue: isFollowUpOverdue(patient),
  };
}

export function buildDashboardMetrics(patients: DashboardPatient[]) {
  const enriched = patients.map(enrichPatient);
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const newThisMonth = enriched.filter(
    (p) => p.createdAt.getMonth() === thisMonth && p.createdAt.getFullYear() === thisYear,
  ).length;

  const inTreatment = enriched.filter((p) => p.workflowStatus === "IN_TREATMENT").length;
  const mdtPending = enriched.filter((p) => p.workflowStatus === "MDT_PENDING").length;
  const followUpsDue = enriched.filter((p) => p.followUpOverdue || p.workflowStatus === "FOLLOW_UP").length;
  const followUpsOverdue = enriched.filter((p) => p.followUpOverdue).length;
  const drafts = enriched.filter((p) => p.workflowStatus === "DRAFT").length;

  const monthCounts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(thisYear, thisMonth - 11 + i, 1);
    const count = enriched.filter(
      (p) =>
        p.createdAt.getMonth() === d.getMonth() && p.createdAt.getFullYear() === d.getFullYear(),
    ).length;
    return {
      label: MONTH_LABELS[d.getMonth()],
      count,
      isCurrent: d.getMonth() === thisMonth && d.getFullYear() === thisYear,
    };
  });

  const maxMonth = Math.max(...monthCounts.map((m) => m.count), 1);
  const registrations = monthCounts.map((m) => ({
    ...m,
    heightPct: Math.round((m.count / maxMonth) * 100) || 4,
    bg: m.isCurrent ? "#0C4F4E" : "#9DC4C1",
  }));

  const withDiagnosis = enriched.filter((p) => p.diagnosis?.cancerType);
  const diagnosisGroups = CANCER_TYPE.map((c) => {
    const count = withDiagnosis.filter((p) => {
      if (c.code === "4") return p.diagnosis?.cancerType === "4" || p.diagnosis?.cancerType === "5";
      return p.diagnosis?.cancerType === c.code;
    }).length;
    return { code: c.code, label: CANCER_LABELS[c.code] ?? c.label, count };
  }).filter((g) => g.code !== "5");

  const diagnosisTotal = diagnosisGroups.reduce((s, g) => s + g.count, 0) || 1;
  const diagnosisDistribution = diagnosisGroups.map((g) => ({
    label: g.label,
    count: g.count,
    pct: Math.round((g.count / diagnosisTotal) * 100),
    widthPct: Math.round((g.count / diagnosisTotal) * 100),
    bg: CANCER_COLORS[g.code] ?? "#0C4F4E",
    searchTerm: g.label.split(" ")[0],
  }));

  const recentPatients = enriched.slice(0, 5).map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.surname.charAt(0)}.`,
    displayId: p.displayId,
    diagnosis: p.diagnosisLabel,
    updated: formatRelative(p.updatedAt),
    status: p.workflowStatus,
  }));

  const tasks = buildTasks(enriched, mdtPending, followUpsOverdue, drafts);

  const patientsBadge = mdtPending + followUpsDue;

  return {
    stats: {
      total: enriched.length,
      newThisMonth,
      inTreatment,
      mdtPending,
      followUpsDue,
      followUpsOverdue,
      drafts,
      customModules: 0,
    },
    registrations,
    diagnosisDistribution,
    recentPatients,
    tasks,
    patientsBadge,
    enriched,
  };
}

function buildTasks(
  patients: ReturnType<typeof enrichPatient>[],
  mdtPending: number,
  followUpsOverdue: number,
  drafts: number,
) {
  const tasks = [];

  if (mdtPending > 0) {
    tasks.push({
      icon: "◫",
      title: `MDT board — ${mdtPending} case${mdtPending === 1 ? "" : "s"} to review`,
      subtitle: "Patients awaiting multidisciplinary discussion",
      href: "/patients?filter=MDT_PENDING",
      bg: "#F3E9EF",
      color: "#7A3B5E",
    });
  }

  if (followUpsOverdue > 0) {
    tasks.push({
      icon: "◷",
      title: `${followUpsOverdue} follow-up${followUpsOverdue === 1 ? "" : "s"} overdue`,
      subtitle: patients
        .filter((p) => p.followUpOverdue)
        .slice(0, 2)
        .map((p) => p.surname)
        .join(", "),
      href: "/patients?filter=FOLLOW_UP",
      bg: "#FBEAEC",
      color: "#B23A48",
    });
  }

  if (drafts > 0) {
    tasks.push({
      icon: "✎",
      title: `${drafts} draft${drafts === 1 ? "" : "s"} awaiting completion`,
      subtitle: "Registration or diagnosis not yet complete",
      href: "/patients?filter=DRAFT",
      bg: "#FBEFD9",
      color: "#9A6B17",
    });
  }

  const monthName = new Date().toLocaleString("en", { month: "long", year: "numeric" });
  tasks.push({
    icon: "⤓",
    title: "Monthly export ready",
    subtitle: `${monthName} cohort available`,
    href: "/reports",
    bg: "#E7F1EE",
    color: "#0C5C4E",
  });

  return tasks;
}

function formatRelative(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function filterByWorkflow(
  patients: ReturnType<typeof enrichPatient>[],
  filter?: string | null,
): ReturnType<typeof enrichPatient>[] {
  if (!filter || filter === "ALL") return patients;
  return patients.filter((p) => p.workflowStatus === (filter as WorkflowStatus));
}

export function filterBySearch(
  patients: ReturnType<typeof enrichPatient>[],
  q?: string | null,
): ReturnType<typeof enrichPatient>[] {
  if (!q?.trim()) return patients;
  const term = q.trim().toLowerCase();
  return patients.filter(
    (p) =>
      p.registryNumber.toLowerCase().includes(term) ||
      p.displayId.toLowerCase().includes(term) ||
      p.firstName.toLowerCase().includes(term) ||
      p.surname.toLowerCase().includes(term) ||
      p.diagnosisLabel.toLowerCase().includes(term) ||
      (p.hospitalNumber?.toLowerCase().includes(term) ?? false),
  );
}
