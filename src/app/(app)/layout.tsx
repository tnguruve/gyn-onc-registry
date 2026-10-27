import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { loadOperationsBoard } from "@/lib/clinical-queues";
import { RegistryShell } from "@/components/layout/registry-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  let patientsBadge = 0;
  try {
    const board = await loadOperationsBoard();
    patientsBadge = board.patientsBadge;
  } catch {
    patientsBadge = 0;
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#F4F1EB]">Loading…</div>}>
      <RegistryShell user={user} patientsBadge={patientsBadge}>
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </RegistryShell>
    </Suspense>
  );
}
