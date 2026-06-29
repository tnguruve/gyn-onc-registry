import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { seedRegistry } from "@/lib/seed-data";

async function seedDatabase() {
  "use server";
  if (process.env.NODE_ENV === "production" && !process.env.SETUP_SECRET) {
    throw new Error("Setup is disabled in production without SETUP_SECRET.");
  }

  if (process.env.NODE_ENV === "production") {
    const base = process.env.NEXT_PUBLIC_APP_URL;
    if (!base) throw new Error("NEXT_PUBLIC_APP_URL is required for production setup.");
    await fetch(`${base}/api/seed`, {
      method: "POST",
      headers: { "x-setup-secret": process.env.SETUP_SECRET! },
    });
    return;
  }

  await seedRegistry(prisma);
}

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Database Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Run this once after installing to create default user accounts and a demo patient (GYN0001).
          </p>
          <form action={seedDatabase}>
            <Button type="submit">Create default users &amp; demo case</Button>
          </form>
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">Default accounts</p>
            <ul className="mt-2 space-y-1 font-mono text-xs">
              <li>admin@registry.local / Admin123!</li>
              <li>clinician@registry.local / Clinician123! (Dr. Guzha)</li>
              <li>researcher@registry.local / Research123!</li>
            </ul>
          </div>
          <Link href="/login" className="text-sm text-teal-700 underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
