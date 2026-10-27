"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions";
import { WelcomeBrandPanel } from "@/components/auth/welcome-brand-panel";

export function AuthFlow({ error }: { error?: string }) {
  const [loginState, loginFormAction, loginPending] = useActionState<AuthFormState, FormData>(
    loginAction,
    error ? { error } : null,
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F4F1EB] lg:flex-row">
      <WelcomeBrandPanel />

      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:p-10">
        <div className="w-full max-w-[400px]">
          <LoginForm
            action={loginFormAction}
            error={loginState?.error}
            pending={loginPending}
          />
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  action,
  error,
  pending,
}: {
  action: (payload: FormData) => void;
  error?: string;
  pending: boolean;
}) {
  return (
    <>
      <h2 className="font-display mb-2 text-[30px] font-semibold tracking-tight">Sign in</h2>
      <p className="mb-7 text-[14.5px] text-[#5C6B66]">Use your registry email and password.</p>
      <form action={action} className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email address"
        />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        {error ? <ErrorBox message={error} /> : null}
        <button type="submit" disabled={pending} className="auth-primary-btn disabled:opacity-70">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-[12.5px] font-semibold tracking-wide text-[#45524D]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="rg-input h-12 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] bg-white px-3.5 text-base sm:h-11 sm:text-sm"
      />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-[9px] border border-[#F2D6D6] bg-[#FBEEEE] px-3.5 py-2.5 text-[13px] text-[#B23A48]">
      {message}
    </div>
  );
}
