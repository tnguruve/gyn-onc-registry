import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditLogPage() {
  await requirePermission("admin:audit");

  const logs = await prisma.auditLog.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-600">
          Track who viewed, edited, exported, or signed in to the system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="py-3 pr-4">{log.user?.name ?? log.userEmail ?? "System"}</td>
                  <td className="py-3 pr-4 font-medium">{log.action}</td>
                  <td className="py-3 pr-4">
                    {log.entityType ?? "—"}
                    {log.entityId ? ` (${log.entityId.slice(0, 8)}…)` : ""}
                  </td>
                  <td className="py-3">{log.details ?? "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No audit events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
