import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  return <AppShell user={user}>{children}</AppShell>;
}
