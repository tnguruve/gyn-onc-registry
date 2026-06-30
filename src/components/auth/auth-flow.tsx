"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, signupAction, type AuthFormState } from "@/app/actions";
import { WelcomeBrandPanel } from "@/components/auth/welcome-brand-panel";
import { useReducedMotion } from "@/components/auth/use-reduced-motion";

type Mode = "signup" | "login";
type LoginStep = "intro" | "form";

export function AuthFlow({ error, initialMode = "login" }: { error?: string; initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loginStep, setLoginStep] = useState<LoginStep>(
    initialMode === "login" && !error ? "intro" : "form",
  );
  const [signupState, signupFormAction, signupPending] = useActionState<AuthFormState, FormData>(
    signupAction,
    error && initialMode === "signup" ? { error } : null,
  );
  const [loginState, loginFormAction, loginPending] = useActionState<AuthFormState, FormData>(
    loginAction,
    error && initialMode === "login" ? { error } : null,
  );

  const formRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(true);

  useEffect(() => {
    const urlMode = searchParams.get("mode") === "signup" ? "signup" : "login";
    setMode(urlMode);
    if (urlMode === "signup") setLoginStep("form");
    else if (!error) setLoginStep("intro");
  }, [searchParams, error]);

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mode, loginStep]);

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next);
      setLoginStep(next === "login" ? "intro" : "form");
      router.replace(`/login?mode=${next}`, { scroll: false });
    },
    [router],
  );

  const headerAuth = <AuthModeToggle mode={mode} onSwitch={switchMode} />;

  const creamStepIndex = mode === "login" ? (loginStep === "intro" ? 0 : 1) : 0;
  const stepAnimClass = reducedMotion ? "" : "auth-step-enter-forward";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F4F1EB] lg:flex-row lg:overflow-hidden">
      <WelcomeBrandPanel headerAuthTabs={headerAuth} />

      <div
        ref={formRef}
        className="relative flex flex-1 scroll-mt-2 items-start justify-center px-4 py-8 sm:px-8 sm:py-10 lg:scroll-mt-0 lg:items-center lg:p-10"
      >
        <div className="absolute top-6 right-4 flex items-center gap-2 sm:right-8 lg:top-[30px] lg:right-[38px]">
          <StepBar active={creamStepIndex >= 0} wide={creamStepIndex === 0} />
          <StepBar active={creamStepIndex >= 1} wide={creamStepIndex === 1} />
        </div>

        <div className="w-full max-w-[400px] pt-6 lg:pt-0">
          {mode === "login" && loginStep === "intro" ? (
            <div key="intro" className={stepAnimClass}>
              <WelcomeIntro
                onContinue={() => setLoginStep("form")}
                onSignup={() => switchMode("signup")}
              />
            </div>
          ) : mode === "signup" ? (
            <div key="signup" className={stepAnimClass}>
              <SignupForm
                action={signupFormAction}
                error={signupState?.error}
                pending={signupPending}
                onSignIn={() => switchMode("login")}
              />
            </div>
          ) : (
            <div key="login-form" className={stepAnimClass}>
              <LoginForm
                action={loginFormAction}
                error={loginState?.error}
                pending={loginPending}
                onBack={() => setLoginStep("intro")}
                onSignup={() => switchMode("signup")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBar({ active, wide }: { active: boolean; wide: boolean }) {
  return (
    <div
      className="h-1 rounded-sm transition-[width,background-color] duration-[400ms] ease-out"
      style={{
        width: wide ? 28 : 12,
        background: active ? "#0C4F4E" : "#E2DDD3",
      }}
    />
  );
}

function WelcomeIntro({ onContinue, onSignup }: { onContinue: () => void; onSignup: () => void }) {
  return (
    <>
      <div className="font-mono-data mb-4 text-xs tracking-[2px] text-[#7A3B5E] uppercase">Welcome</div>
      <h2 className="font-display mb-3.5 text-[34px] leading-[1.15] font-semibold tracking-tight">
        Sign in to the registry
      </h2>
      <p className="mb-9 text-[15.5px] leading-relaxed text-[#5C6B66]">
        Access is restricted to authorised clinical and research staff. All activity is recorded in the audit trail.
      </p>
      <button type="button" onClick={onContinue} className="auth-primary-btn">
        Continue to sign in <span className="text-lg">→</span>
      </button>
      <div className="my-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E2DDD3]" />
        <span className="text-xs text-[#9aa5a0]">or</span>
        <div className="h-px flex-1 bg-[#E2DDD3]" />
      </div>
      <button type="button" disabled title="Coming soon" className="auth-secondary-btn cursor-not-allowed opacity-70">
        <span className="inline-block h-[18px] w-[18px] rounded border-[1.5px] border-[#7A3B5E]" />
        Continue with hospital SSO
        <span className="text-xs">(Coming soon)</span>
      </button>
      <div className="my-7 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E2DDD3]" />
        <span className="text-xs text-[#9aa5a0]">or</span>
        <div className="h-px flex-1 bg-[#E2DDD3]" />
      </div>
      <button type="button" onClick={onSignup} className="auth-secondary-btn">
        Create an account
      </button>
      <p className="mt-8 text-[12.5px] leading-relaxed text-[#9aa5a0]">
        Need access? Contact your registry administrator. Unauthorised access is prohibited.
      </p>
    </>
  );
}

function SignupForm({
  action,
  error,
  pending,
  onSignIn,
}: {
  action: (payload: FormData) => void;
  error?: string;
  pending: boolean;
  onSignIn: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onSignIn}
        className="mb-7 flex items-center gap-1.5 text-[13.5px] text-[#5C6B66]"
      >
        ← Back to sign in
      </button>
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
      <p className="mt-5 text-center text-[12.5px] text-[#9aa5a0]">
        Already have an account?{" "}
        <button type="button" onClick={onSignIn} className="text-[#7A3B5E] underline">
          Sign in
        </button>
      </p>
    </>
  );
}

function LoginForm({
  action,
  error,
  pending,
  onBack,
  onSignup,
}: {
  action: (payload: FormData) => void;
  error?: string;
  pending: boolean;
  onBack?: () => void;
  onSignup?: () => void;
}) {
  return (
    <>
      {onBack ? (
        <button type="button" onClick={onBack} className="mb-7 flex items-center gap-1.5 text-[13.5px] text-[#5C6B66]">
          ← Back
        </button>
      ) : null}
      <h2 className="font-display mb-2 text-[30px] font-semibold tracking-tight">Staff sign in</h2>
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {onSignup ? (
        <p className="mt-5 text-center text-[12.5px] text-[#9aa5a0]">
          Don&apos;t have an account?{" "}
          <button type="button" onClick={onSignup} className="text-[#7A3B5E] underline">
            Create one
          </button>
        </p>
      ) : null}
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

function AuthModeToggle({ mode, onSwitch }: { mode: Mode; onSwitch: (mode: Mode) => void }) {
  return (
    <div className="flex rounded-[10px] bg-white p-1 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.35)]">
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
