"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, signupAction, type AuthFormState } from "@/app/actions";
import { WelcomeBrandPanel } from "@/components/auth/welcome-brand-panel";

type Mode = "signup" | "login";

export function AuthFlow({ error, initialMode = "signup" }: { error?: string; initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [signupState, signupFormAction, signupPending] = useActionState<AuthFormState, FormData>(
    signupAction,
    error && initialMode === "signup" ? { error } : null,
  );
  const [loginState, loginFormAction, loginPending] = useActionState<AuthFormState, FormData>(
    loginAction,
    error && initialMode === "login" ? { error } : null,
  );

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlMode = searchParams.get("mode") === "login" ? "login" : "signup";
    setMode(urlMode);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mode]);

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next);
      router.replace(`/login?mode=${next}`, { scroll: false });
    },
    [router],
  );

  const headerAuth = <AuthModeToggle mode={mode} onSwitch={switchMode} variant="header-pill" />;
  const modeToggleDesktop = (
    <AuthModeToggle mode={mode} onSwitch={switchMode} variant="on-paper" className="mb-8 hidden lg:flex" />
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F4F1EB] lg:flex-row lg:overflow-hidden">
      <WelcomeBrandPanel headerAuthTabs={headerAuth} />

      <div
        ref={formRef}
        className="relative flex flex-1 scroll-mt-2 items-start justify-center px-4 py-6 sm:px-8 sm:py-10 lg:scroll-mt-0 lg:items-center lg:p-10"
      >
        <div className="w-full max-w-[400px]">
          {modeToggleDesktop}

          {mode === "signup" ? (
            <SignupForm action={signupFormAction} error={signupState?.error} pending={signupPending} />
          ) : (
            <LoginForm action={loginFormAction} error={loginState?.error} pending={loginPending} />
          )}

          <p className="mt-6 text-center text-[12px] text-[#9aa5a0]">
            Testing mode — open registration. Invite-only access will return later.
          </p>
        </div>
      </div>
    </div>
  );
}

function SignupForm({
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
      <div className="font-mono-data mb-4 text-xs tracking-[2px] text-[#7A3B5E] uppercase">Get started</div>
      <h2 className="font-display mb-2 text-[26px] font-semibold tracking-tight sm:text-[30px]">Create an account</h2>
      <p className="mb-7 text-[14.5px] text-[#5C6B66]">Email and password — that&apos;s all for now.</p>
      <form action={action} className="space-y-5">
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@hospital.org" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" />
        <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" />
        {error ? <ErrorBox message={error} /> : null}
        <button type="submit" disabled={pending} className="auth-primary-btn disabled:opacity-70">
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </>
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
      <div className="font-mono-data mb-4 text-xs tracking-[2px] text-[#7A3B5E] uppercase">Welcome back</div>
      <h2 className="font-display mb-2 text-[26px] font-semibold tracking-tight sm:text-[30px]">Log in</h2>
      <p className="mb-7 text-[14.5px] text-[#5C6B66]">Enter your registry credentials to continue.</p>
      <form action={action} className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="e.g. clinician@registry.local"
        />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        {error ? <ErrorBox message={error} /> : null}
        <button type="submit" disabled={pending} className="auth-primary-btn disabled:opacity-70">
          {pending ? "Signing in…" : "Log in"}
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
      <label className="mb-2 block text-[12.5px] font-semibold tracking-wide text-[#45524D]">{label}</label>
      <input
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

function AuthModeToggle({
  mode,
  onSwitch,
  variant,
  className = "",
}: {
  mode: Mode;
  onSwitch: (mode: Mode) => void;
  variant: "on-brand" | "on-paper" | "header-pill";
  className?: string;
}) {
  if (variant === "header-pill") {
    return (
      <div className={`flex rounded-[10px] bg-white p-1 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.35)] ${className}`}>
        <button
          type="button"
          onClick={() => onSwitch("signup")}
          className={`rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
            mode === "signup" ? "bg-[#0C4F4E] text-white" : "text-[#5C6B66]"
          }`}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className={`rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
            mode === "login" ? "bg-[#0C4F4E] text-white" : "text-[#5C6B66]"
          }`}
        >
          Log in
        </button>
      </div>
    );
  }

  const isBrand = variant === "on-brand";
  return (
    <div
      className={`flex rounded-xl p-1 ${
        isBrand
          ? "border border-[rgba(234,242,240,0.22)] bg-[rgba(0,0,0,0.14)] backdrop-blur-sm"
          : "border border-[#E2DDD3] bg-[#FAF8F4]"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onSwitch("signup")}
        className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${
          mode === "signup"
            ? isBrand
              ? "bg-white text-[#0C4F4E] shadow-sm"
              : "bg-white text-[#0C4F4E] shadow-sm"
            : isBrand
              ? "text-[rgba(234,242,240,0.85)]"
              : "text-[#5C6B66]"
        }`}
      >
        Create account
      </button>
      <button
        type="button"
        onClick={() => onSwitch("login")}
        className={`flex-1 rounded-lg py-3 text-sm font-semibold transition ${
          mode === "login"
            ? isBrand
              ? "bg-white text-[#0C4F4E] shadow-sm"
              : "bg-white text-[#0C4F4E] shadow-sm"
            : isBrand
              ? "text-[rgba(234,242,240,0.85)]"
              : "text-[#5C6B66]"
        }`}
      >
        Log in
      </button>
    </div>
  );
}
