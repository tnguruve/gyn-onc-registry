import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { acceptInviteAction } from "@/app/actions";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) notFound();
  if (invite.usedAt) {
    return (
      <InviteLayout>
        <p className="text-[#5C6B66]">This invitation has already been used.</p>
        <Link href="/login" className="mt-4 inline-block text-[#7A3B5E] underline">
          Sign in
        </Link>
      </InviteLayout>
    );
  }
  if (invite.expiresAt < new Date()) {
    return (
      <InviteLayout>
        <p className="text-[#B23A48]">This invitation has expired. Contact your administrator.</p>
      </InviteLayout>
    );
  }

  return (
    <InviteLayout>
      <div className="font-mono-data mb-4 text-xs tracking-[2px] text-[#7A3B5E] uppercase">Invitation</div>
      <h2 className="font-display mb-2 text-[30px] font-semibold tracking-tight">Create your account</h2>
      <p className="mb-7 text-[14.5px] text-[#5C6B66]">
        You&apos;ve been invited as <strong>{invite.name}</strong> ({invite.email}). Set a password to access the
        registry.
      </p>
      {error ? (
        <div className="mb-4 rounded-[9px] border border-[#F2D6D6] bg-[#FBEEEE] px-3.5 py-2.5 text-[13px] text-[#B23A48]">
          {decodeURIComponent(error)}
        </div>
      ) : null}
      <form action={acceptInviteAction.bind(null, token)} className="space-y-4">
        <div>
          <label className="mb-2 block text-[12.5px] font-semibold text-[#45524D]">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] px-3.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-[12.5px] font-semibold text-[#45524D]">Confirm password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] px-3.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="h-[54px] w-full rounded-xl bg-[#0C4F4E] text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(12,79,78,0.65)]"
        >
          Activate account
        </button>
      </form>
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F1EB] p-8">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#EAE5DA] bg-white p-8">{children}</div>
    </div>
  );
}
