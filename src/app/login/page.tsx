import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { AuthFlow } from "@/components/auth/auth-flow";

function LoginContent({
  error,
  initialMode,
}: {
  error?: string;
  initialMode: "signup" | "login";
}) {
  return <AuthFlow error={error} initialMode={initialMode} />;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const initialMode = params.mode === "signup" ? "signup" : "login";

  return (
    <Suspense fallback={null}>
      <LoginContent error={params.error} initialMode={initialMode} />
    </Suspense>
  );
}
