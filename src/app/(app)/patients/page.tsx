import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { CANCER_TYPE, FIGO_STAGE, labelFor, PROVINCES } from "@/lib/codes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/field";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cancer?: string; province?: string }>;
}) {
  await requirePermission("patients:read");
  const params = await searchParams;
  const q = params.q?.trim();

  const patients = await prisma.patient.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { registryNumber: { contains: q } },
              { firstName: { contains: q } },
              { surname: { contains: q } },
              { hospitalNumber: { contains: q } },
              { nationalId: { contains: q } },
            ],
          }
        : {}),
      ...(params.province ? { province: params.province } : {}),
      ...(params.cancer ? { diagnosis: { cancerType: params.cancer } } : {}),
    },
    include: { diagnosis: true },
    orderBy: [{ surname: "asc" }, { firstName: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patient search</h1>
          <p className="text-sm text-slate-600">Registry number, name, hospital #, or national ID</p>
        </div>
        <Link href="/patients/new">
          <Button>Register patient</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-4">
            <FormField className="md:col-span-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={params.q} placeholder="GYN0001, name, hospital #..." />
            </FormField>
            <FormField>
              <Label htmlFor="province">Province code</Label>
              <Input id="province" name="province" defaultValue={params.province} placeholder="1-10" />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Search</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{patients.length} patient{patients.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4">Registry #</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">DOB</th>
                <th className="py-2 pr-4">Province</th>
                <th className="py-2 pr-4">Cancer / FIGO</th>
                <th className="py-2">Open</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-mono text-xs">{p.registryNumber}</td>
                  <td className="py-3 pr-4">{p.surname}, {p.firstName}</td>
                  <td className="py-3 pr-4">{formatDate(p.dateOfBirth)}</td>
                  <td className="py-3 pr-4">{labelFor(PROVINCES, p.province)}</td>
                  <td className="py-3 pr-4">
                    {labelFor(CANCER_TYPE, p.diagnosis?.cancerType)} · {labelFor(FIGO_STAGE, p.diagnosis?.figoStage)}
                  </td>
                  <td className="py-3">
                    <Link href={`/patients/${p.id}`} className="text-teal-700 underline">Chart</Link>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
