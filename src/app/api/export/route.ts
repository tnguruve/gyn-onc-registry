import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { getSession, requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  buildExportRows,
  EXPORT_FILENAME,
  fetchPatientsForExport,
  type ExportFilters,
} from "@/lib/export-dataset";
import { buildSpssSyntax, buildStataSyntax } from "@/lib/export-syntax";

function parseFilters(searchParams: URLSearchParams): ExportFilters {
  return {
    cancerType: searchParams.get("cancer") ?? undefined,
    province: searchParams.get("province") ?? undefined,
    consentOnly: searchParams.get("consent") === "1",
    dateFrom: searchParams.get("from") ?? undefined,
    dateTo: searchParams.get("to") ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission("export:deidentified");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filters = parseFilters(searchParams);
  const format = searchParams.get("format") ?? "csv";
  const dateStamp = new Date().toISOString().slice(0, 10);

  const patients = await fetchPatientsForExport(filters);
  const rows = buildExportRows(patients);

  await prisma.exportLog.create({
    data: {
      userId: session.id,
      filters: JSON.stringify({ ...filters, format }),
      recordCount: rows.length,
      deidentified: true,
    },
  });

  await logAudit({
    userId: session.id,
    userEmail: session.email,
    action: "EXPORT",
    entityType: "GynOncDataset",
    details: `${rows.length} de-identified records (${format})`,
  });

  if (format === "spss") {
    const body = buildSpssSyntax(rows);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${EXPORT_FILENAME}-${dateStamp}.sps"`,
      },
    });
  }

  if (format === "stata") {
    const body = buildStataSyntax(rows);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${EXPORT_FILENAME}-${dateStamp}.do"`,
      },
    });
  }

  const csv = Papa.unparse(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${EXPORT_FILENAME}-${dateStamp}.csv"`,
    },
  });
}
