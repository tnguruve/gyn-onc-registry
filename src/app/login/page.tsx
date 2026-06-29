import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FormField } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Zimbabwe Gynaecological Oncology Registry</CardTitle>
          <p className="text-sm text-slate-600">
            Sign in to access the prospective registry (ESGO/SGO-aligned modules).
          </p>
        </CardHeader>
        <CardContent>
          {params.error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {params.error}
            </p>
          )}
          <form action={loginAction} className="space-y-4">
            <FormField>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </FormField>
            <FormField>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </FormField>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500">
            First time setup?{" "}
            <Link href="/setup" className="text-teal-700 underline">
              Initialize database
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
