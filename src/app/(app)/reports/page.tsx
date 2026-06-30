import { requirePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/field";
import { prisma } from "@/lib/db";

export default async function ReportsPage() {
  await requirePermission("reports:read");

  const exportLogs = await prisma.exportLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Research export</h1>
        <p className="text-sm text-slate-600">
          De-identified, coded dataset for SPSS, Stata, and R. Includes auto-calculated delays and survival metrics.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Export filters</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <FormField>
              <Label htmlFor="cancer">Cancer type code (1–6)</Label>
              <Input id="cancer" name="cancer" placeholder="1=Cervix, 2=Ovary..." />
            </FormField>
            <FormField>
              <Label htmlFor="province">Province code (1–10)</Label>
              <Input id="province" name="province" />
            </FormField>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary">Preview filters</Button>
              <a href="/api/export">
                <Button type="button">Download de-identified CSV</Button>
              </a>
            </div>
          </form>
          <p className="mt-4 text-xs text-slate-500">
            1=Cervix · 2=Ovary · 3=Endometrium · 4=Vulva · 5=Vagina · 6=GTD · 7=GTN
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent exports</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {exportLogs.map((log) => (
              <li key={log.id} className="flex justify-between border-b border-slate-100 py-2">
                <span>{log.user.name} · {log.recordCount} records</span>
                <span className="text-slate-500">{log.createdAt.toLocaleString()}</span>
              </li>
            ))}
            {exportLogs.length === 0 && <li className="text-slate-500">No exports yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
