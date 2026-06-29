import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthFlow } from "@/components/auth/auth-flow";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;

  return <AuthFlow error={params.error} />;
}
