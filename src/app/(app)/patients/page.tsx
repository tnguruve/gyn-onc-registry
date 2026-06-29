import Link from "next/link";
import {
  buildDashboardMetrics,
  filterBySearch,
  filterByWorkflow,
  loadDashboardPatients,
} from "@/lib/dashboard-metrics";
import { FIGO_STAGE, HIV_STATUS, labelFor } from "@/lib/codes";
import { statusPill } from "@/lib/status-pills";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { DeletePatientButton } from "@/components/registry/delete-patient-button";

const FILTERS = [
  { key: "ALL", label: "All patients" },
  { key: "IN_TREATMENT", label: "In treatment" },
  { key: "MDT_PENDING", label: "MDT pending" },
  { key: "FOLLOW_UP", label: "Follow-up" },
  { key: "DRAFT", label: "Draft" },
];

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; deleted?: string }>;
}) {
  const user = await requireSession();
  const canDelete = hasPermission(user.role, "patients:delete");
  const params = await searchParams;
  const raw = await loadDashboardPatients();
  const metrics = buildDashboardMetrics(raw);
  let patients = metrics.enriched;
  patients = filterByWorkflow(patients, params.filter);
  patients = filterBySearch(patients, params.q);

  return (
    <div>
      {params.deleted ? (
        <div className="mb-4 rounded-[10px] border border-[#D5E4E2] bg-[#ECF3F2] px-4 py-3 text-sm text-[#0C4F4E]">
          Patient record deleted. Dashboard counts have been updated.
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {FILTERS.map((f) => {
          const active = (params.filter ?? "ALL") === f.key || (!params.filter && f.key === "ALL");
          const href =
            f.key === "ALL"
              ? `/patients${params.q ? `?q=${encodeURIComponent(params.q)}` : ""}`
              : `/patients?filter=${f.key}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`h-10 rounded-[10px] border-[1.5px] px-4 text-[13px] transition ${
                active
                  ? "border-[#0C4F4E] bg-[#0C4F4E] font-semibold text-white"
                  : "border-[#E2DDD3] bg-white text-[#45524D]"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
        <Link
          href="/patients/new"
          className="ml-auto flex h-10 items-center gap-2 rounded-[10px] bg-[#0C4F4E] px-4 text-[13.5px] font-semibold text-white"
        >
          ＋ New patient
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAE5DA] bg-white">
        <div className="grid grid-cols-[1.5fr_1fr_.7fr_.8fr_1fr_auto] gap-3 border-b border-[#EAE5DA] px-5 py-3.5 text-[11.5px] font-semibold tracking-wide text-[#9aa5a0] uppercase">
          <div className="col-span-5 grid grid-cols-[1.5fr_1fr_.7fr_.8fr_1fr] gap-3">
            <div>Patient</div>
            <div>Diagnosis</div>
            <div>Stage</div>
            <div>HIV</div>
            <div>Status</div>
          </div>
          {canDelete ? <div className="text-right">Actions</div> : null}
        </div>
        {patients.map((p) => {
          const pill = statusPill(p.workflowStatus);
          const hiv =
            p.hivStatus === "2"
              ? { bg: "#F3E9EF", text: "#7A3B5E", label: "Positive" }
              : { bg: "#EEF1EC", text: "#5C6B66", label: labelFor(HIV_STATUS, p.hivStatus) || "—" };
          return (
            <div
              key={p.id}
              className="grid grid-cols-[1.5fr_1fr_.7fr_.8fr_1fr_auto] items-center gap-3 border-b border-[#F4F0E8] px-5 py-3.5"
            >
              <Link
                href={`/patients/${p.id}`}
                className="col-span-5 grid grid-cols-[1.5fr_1fr_.7fr_.8fr_1fr] items-center gap-3 transition hover:opacity-80"
              >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#ECF3F2] text-[13px] font-semibold text-[#0C4F4E]">
                  {p.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {p.surname}, {p.firstName}
                  </div>
                  <div className="font-mono-data text-[11.5px] text-[#9aa5a0]">
                    {p.displayId} · {p.age}y
                  </div>
                </div>
              </div>
              <div className="text-[13px]">{p.diagnosisLabel}</div>
              <div className="font-mono-data text-[12px] text-[#7C8983]">
                {labelFor(FIGO_STAGE, p.diagnosis?.figoStage) || "—"}
              </div>
              <span
                className="inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: hiv.bg, color: hiv.text }}
              >
                {hiv.label}
              </span>
              <span
                className="inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                style={{ background: pill.bg, color: pill.text }}
              >
                {pill.label}
              </span>
              </Link>
              {canDelete ? (
                <div className="flex justify-end">
                  <DeletePatientButton
                    patientId={p.id}
                    patientLabel={`${p.displayId} — ${p.surname}, ${p.firstName}`}
                    variant="inline"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {patients.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#7C8983]">No patients match this filter.</p>
        ) : null}
        <div className="px-5 py-3 text-[12.5px] text-[#7C8983]">
          Showing {patients.length} of {metrics.stats.total}
        </div>
      </div>
    </div>
  );
}
