import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedRegistry } from "@/lib/seed-data";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    const secret = request.headers.get("x-setup-secret");
    if (!process.env.SETUP_SECRET || secret !== process.env.SETUP_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const result = await seedRegistry(prisma);
  return NextResponse.json(result);
}
