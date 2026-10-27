import Link from "next/link";
import { loadOperationsBoard } from "@/lib/clinical-queues";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function DashboardPage() {
  const user = await requireSession();
  const clinicalQueues = hasPermission(user.role, "clinical:read");
  let board;
  try {
    board = await loadOperationsBoard();
  } catch {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        Clinical queues could not be loaded. If Neon is asleep, run SELECT 1 in the SQL editor, then refresh.
      </div>
    );
  }

  if (!clinicalQueues) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#D5E4E2] bg-[#ECF3F2] px-5 py-4 text-sm text-[#0C4F4E]">
          <p className="font-semibold">Registration</p>
          <p className="mt-1 text-[#45524D]">
            {board.registered} patients on the registry. Open Patients to register or find a record.
          </p>
        </div>
        <Stat n={board.registered} t="Registered" href="/patients" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#D5E4E2] bg-[#ECF3F2] px-5 py-4 text-sm text-[#0C4F4E]">
        <p className="font-semibold">Clinical operations</p>
        <p className="mt-1 text-[#45524D]">
          Live queues from the patient chart. Potential LTFU uses a {board.ltfuDays}-day missed-appointment rule
          (department policy).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat n={board.registered} t="Registered" href="/patients" />
        <Stat n={board.readyMdt} t="Ready for MDT" href="/dashboard" />
        <Stat n={board.treatmentPending} t="Treatment pending" href="/dashboard" />
        <Stat n={board.missedFollowup} t="Missed follow-up" href="/dashboard" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {board.queues.map((q) => (
          <section key={q.key} className="rounded-2xl border border-[#EAE5DA] bg-white p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">{q.label}</h2>
              <strong className="font-display text-xl">{q.count}</strong>
            </div>
            <div className="flex flex-col">
              {q.items.map((item, i) => (
                <Link
                  key={`${q.key}-${item.patientId}-${item.tumourId ?? i}`}
                  href={`/patients/${item.patientId}`}
                  className="flex justify-between gap-2 border-b border-[#F4F0E8] py-2.5 text-sm hover:bg-[#FBFAF6]"
                >
                  <div>
                    <div className="font-mono-data text-[12px] text-[#0C4F4E]">{item.registryId}</div>
                    <div className="font-semibold">{item.name}</div>
                  </div>
                  <div className="text-right text-[12.5px] text-[#5C6B66]">
                    <div>{item.site}</div>
                    <div>{item.detail}</div>
                  </div>
                </Link>
              ))}
              {q.count === 0 ? <p className="py-4 text-sm text-[#7C8983]">No patients in this queue.</p> : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ n, t, href }: { n: number; t: string; href: string }) {
  return (
    <Link href={href} className="rounded-[14px] border border-[#EAE5DA] bg-white px-4 py-4">
      <div className="mb-2 text-[12.5px] text-[#7C8983]">{t}</div>
      <div className="font-display text-[30px] leading-none font-semibold">{n}</div>
    </Link>
  );
}
