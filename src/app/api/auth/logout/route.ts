import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAudit({
      userId: session.id,
      userEmail: session.email,
      action: "LOGOUT",
      entityType: "User",
      entityId: session.id,
    });
  }
  await destroySession();
  redirect("/login");
}
