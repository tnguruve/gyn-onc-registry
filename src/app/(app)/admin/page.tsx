import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { roleLabel } from "@/lib/permissions";
import { createInviteAction, toggleUserActiveAction } from "@/app/actions";
import { formatDate } from "@/lib/utils";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  await requirePermission("admin:users");

  const params = await searchParams;
  const [users, invites, auditLogs] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#0C4F4E]">Activity log</h1>
        <p className="mt-1 text-sm text-[#5C6B66]">
          Invite staff, manage users, and review sign-ins and registry changes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#EAE5DA] bg-white p-6">
            <h2 className="font-display mb-1 text-xl font-semibold">Invite staff</h2>
            <p className="mb-5 text-sm text-[#5C6B66]">
              No public sign-up. Send an invite link — they set their password on first visit.
            </p>
            {params.error ? (
              <div className="mb-4 rounded-lg border border-[#F2D6D6] bg-[#FBEEEE] px-3 py-2 text-sm text-[#B23A48]">
                {decodeURIComponent(params.error)}
              </div>
            ) : null}
            {params.invite ? (
              <div className="mb-5 rounded-lg border border-[#D5E4E2] bg-[#ECF3F2] p-4">
                <p className="mb-2 text-xs font-semibold tracking-wide text-[#0C4F4E] uppercase">
                  Copy invite link
                </p>
                <code className="font-mono-data block break-all text-[12px] text-[#1A2421]">
                  {decodeURIComponent(params.invite)}
                </code>
              </div>
            ) : null}
            <form action={createInviteAction} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#45524D]">Full name</label>
                <input
                  name="name"
                  required
                  className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#45524D]">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-[#45524D]">Role</label>
                <select
                  name="role"
                  defaultValue="FRONT_DESK"
                  className="h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] px-3 text-sm"
                >
                  <option value="FRONT_DESK">Front desk</option>
                  <option value="CLINICIAN">Clinician</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <button
                type="submit"
                className="h-11 rounded-[10px] bg-[#0C4F4E] text-sm font-semibold text-white sm:col-span-2"
              >
                Create invite link
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#EAE5DA] bg-white p-6">
            <h2 className="font-display mb-4 text-xl font-semibold">Users</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EAE5DA] text-[#7C8983]">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#F4F0E8]">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{u.name}</div>
                      <div className="font-mono-data text-xs text-[#9aa5a0]">{u.email}</div>
                    </td>
                    <td className="py-3 pr-4">{roleLabel(u.role)}</td>
                    <td className="py-3">
                      {u.active ? (
                        <span className="text-[#1F8A5B]">Active</span>
                      ) : (
                        <form action={toggleUserActiveAction.bind(null, u.id, true)}>
                          <button type="submit" className="text-[#7A3B5E] underline">
                            Enable
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#EAE5DA] bg-white p-6">
            <h2 className="font-display mb-4 text-lg font-semibold">Recent invites</h2>
            <ul className="space-y-3 text-sm">
              {invites.map((inv) => (
                <li key={inv.id} className="border-b border-[#F4F0E8] pb-3">
                  <div className="font-medium">{inv.name}</div>
                  <div className="font-mono-data text-xs text-[#9aa5a0]">{inv.email}</div>
                  <div className="mt-1 text-xs text-[#7C8983]">
                    {roleLabel(inv.role)} · {inv.usedAt ? "Accepted" : "Pending"} · expires{" "}
                    {formatDate(inv.expiresAt)}
                  </div>
                </li>
              ))}
              {invites.length === 0 ? <li className="text-[#7C8983]">No invites yet.</li> : null}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#EAE5DA] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Recent activity</h2>
              <Link href="/admin/audit" className="text-xs text-[#7A3B5E]">
                View all →
              </Link>
            </div>
            <ul className="space-y-3 text-sm">
              {auditLogs.map((log) => (
                <li key={log.id} className="flex justify-between gap-2 border-b border-[#F4F0E8] pb-2">
                  <span>
                    <strong>{log.userEmail ?? "System"}</strong> — {log.action}
                  </span>
                  <span className="font-mono-data shrink-0 text-xs text-[#9aa5a0]">
                    {formatDate(log.createdAt)}
                  </span>
                </li>
              ))}
              {auditLogs.length === 0 ? <li className="text-[#7C8983]">No activity yet.</li> : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
