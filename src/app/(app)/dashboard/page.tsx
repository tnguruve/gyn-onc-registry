import Link from "next/link";
import { buildDashboardMetrics, loadDashboardPatients } from "@/lib/dashboard-metrics";
import { statusPill } from "@/lib/status-pills";

export default async function DashboardPage() {
  const patients = await loadDashboardPatients();
  const metrics = buildDashboardMetrics(patients);
  const { stats, recentPatients, tasks } = metrics;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#D5E4E2] bg-[#ECF3F2] px-5 py-4 text-sm text-[#0C4F4E]">
        <p className="font-semibold">Front desk — patient entry</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#45524D]">
          <li>
            Open <Link href="/patients" className="underline">Patients</Link> →{" "}
            <strong>＋ New patient</strong> (Module 1)
          </li>
          <li>Open their chart → complete modules 2–13 (diagnosis, surgery, follow-up)</li>
          <li>
            Tick <strong>Module 13 — Research / biobank</strong> when consent is obtained
          </li>
          <li>
            Charts and CSV export update automatically in{" "}
            <Link href="/research" className="underline">
              Research
            </Link>
          </li>
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total patients"
          value={stats.total}
          delta={stats.newThisMonth > 0 ? `↑ ${stats.newThisMonth} this month` : "—"}
          deltaColor={stats.newThisMonth > 0 ? "#1F8A5B" : "#7C8983"}
          href="/patients"
        />
        <StatCard
          label="In active treatment"
          value={stats.inTreatment}
          delta={stats.inTreatment > 0 ? "Currently on treatment" : "—"}
          deltaColor="#7C8983"
          href="/patients?filter=IN_TREATMENT"
        />
        <StatCard
          label="MDT pending"
          value={stats.mdtPending}
          delta={stats.mdtPending > 0 ? "Awaiting board" : "All discussed"}
          deltaColor={stats.mdtPending > 0 ? "#7A3B5E" : "#1F8A5B"}
          href="/patients?filter=MDT_PENDING"
        />
        <StatCard
          label="Follow-ups due"
          value={stats.followUpsDue}
          delta={stats.followUpsOverdue > 0 ? `${stats.followUpsOverdue} overdue` : "On schedule"}
          deltaColor={stats.followUpsOverdue > 0 ? "#B23A48" : "#7C8983"}
          href="/patients?filter=FOLLOW_UP"
        />
        <StatCard
          label="Drafts"
          value={stats.drafts}
          delta={stats.drafts > 0 ? "Awaiting completion" : "None"}
          deltaColor={stats.drafts > 0 ? "#9A6B17" : "#7C8983"}
          href="/patients?filter=DRAFT"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[15px] font-semibold">Recent patients</div>
            <Link href="/patients" className="text-[13px] text-[#7A3B5E]">
              View all →
            </Link>
          </div>
          <div className="flex flex-col">
            {recentPatients.map((p) => {
              const pill = statusPill(p.status);
              return (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}`}
                  className="grid grid-cols-1 items-center gap-2 border-b border-[#F0ECE3] px-2 py-3 transition hover:bg-[#FBFAF6] min-[520px]:grid-cols-[1.4fr_1fr_.8fr_auto]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ECF3F2] text-xs font-semibold text-[#0C4F4E]">
                      {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold">{p.name}</div>
                      <div className="font-mono-data text-[11.5px] text-[#9aa5a0]">{p.displayId}</div>
                    </div>
                  </div>
                  <div className="text-[13px] text-[#45524D]">{p.diagnosis}</div>
                  <div className="text-[12.5px] text-[#7C8983]">{p.updated}</div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap"
                    style={{ background: pill.bg, color: pill.text }}
                  >
                    {pill.label}
                  </span>
                </Link>
              );
            })}
            {recentPatients.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7C8983]">No patients yet. Register your first case.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
          <div className="mb-4 text-[15px] font-semibold">Tasks &amp; alerts</div>
          <div className="flex flex-col gap-3">
            {tasks.map((t) => (
              <Link
                key={t.title}
                href={t.href}
                className="flex gap-3 rounded-[10px] p-1.5 transition hover:bg-[#FBFAF6]"
              >
                <div
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-sm"
                  style={{ background: t.bg, color: t.color }}
                >
                  {t.icon}
                </div>
                <div>
                  <div className="text-[13px] leading-snug font-semibold">{t.title}</div>
                  <div className="mt-0.5 text-xs text-[#7C8983]">{t.subtitle}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaColor,
  href,
}: {
  label: string;
  value: number;
  delta: string;
  deltaColor: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card-hover rounded-[14px] border border-[#EAE5DA] bg-white px-4 py-4 transition"
    >
      <div className="mb-2.5 text-[12.5px] text-[#7C8983]">{label}</div>
      <div className="font-display text-[30px] leading-none font-semibold">{value}</div>
      <div className="mt-2 text-xs" style={{ color: deltaColor }}>
        {delta}
      </div>
    </Link>
  );
}
