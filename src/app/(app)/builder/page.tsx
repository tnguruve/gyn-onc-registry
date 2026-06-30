import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ModuleBuilder } from "@/components/registry/module-builder";

export const dynamic = "force-dynamic";

export default async function ModuleBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; saved?: string; deleted?: string }>;
}) {
  const user = await requireSession();
  if (!hasPermission(user.role, "modules:manage")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const modules = await prisma.customModule.findMany({
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { patientData: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <ModuleBuilder
      modules={modules}
      selectedId={params.module}
      saved={params.saved === "1"}
      deleted={params.deleted === "1"}
    />
  );
}
