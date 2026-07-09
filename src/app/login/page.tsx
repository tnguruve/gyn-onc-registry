import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { AuthFlow } from "@/components/auth/auth-flow";

function LoginContent({ error }: { error?: string }) {
  return <AuthFlow error={error} />;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  if (params.mode === "signup") redirect("/login");

  return (
    <Suspense fallback={null}>
      <LoginContent error={params.error} />
    </Suspense>
  );
}
