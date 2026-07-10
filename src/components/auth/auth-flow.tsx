"use client";

import { useActionState, useState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions";
import { WelcomeBrandPanel } from "@/components/auth/welcome-brand-panel";
import { useReducedMotion } from "@/components/auth/use-reduced-motion";

type LoginStep = "intro" | "form";

export function AuthFlow({ error }: { error?: string }) {
  const reducedMotion = useReducedMotion();
  const [loginStep, setLoginStep] = useState<LoginStep>(error ? "form" : "intro");
  const [loginState, loginFormAction, loginPending] = useActionState<AuthFormState, FormData>(
    loginAction,
    error ? { error } : null,
  );

  const stepAnimClass = reducedMotion ? "" : "auth-step-enter-forward";
  const creamStepIndex = loginStep === "intro" ? 0 : 1;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F4F1EB] lg:flex-row lg:overflow-hidden">
      <WelcomeBrandPanel />

      <div className="relative flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-10 lg:items-center lg:p-10">
        <div className="absolute top-6 right-4 flex items-center gap-2 sm:right-8 lg:top-[30px] lg:right-[38px]">
          <StepBar active={creamStepIndex >= 0} wide={creamStepIndex === 0} />
          <StepBar active={creamStepIndex >= 1} wide={creamStepIndex === 1} />
        </div>

        <div className="w-full max-w-[400px] pt-6 lg:pt-0">
          {loginStep === "intro" ? (
            <div key="intro" className={stepAnimClass}>
              <WelcomeIntro onContinue={() => setLoginStep("form")} />
            </div>
          ) : (
            <div key="login-form" className={stepAnimClass}>
              <LoginForm
                action={loginFormAction}
                error={loginState?.error}
                pending={loginPending}
                onBack={() => setLoginStep("intro")}
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

function WelcomeIntro({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <div className="font-mono-data mb-4 text-xs tracking-[2px] text-[#7A3B5E] uppercase">Parirenyatwa</div>
      <h2 className="font-display mb-3.5 text-[34px] leading-[1.15] font-semibold tracking-tight">
        Gynaecological Oncology Registry
      </h2>
      <p className="mb-9 text-[15.5px] leading-relaxed text-[#5C6B66]">
        One place to register patients, complete clinical modules, and download research data. Sign in with your
        registry email and password.
      </p>
      <button type="button" onClick={onContinue} className="auth-primary-btn">
        Sign in <span className="text-lg">→</span>
      </button>
      <p className="mt-8 text-[12.5px] leading-relaxed text-[#9aa5a0]">
        First time? Run setup once at <span className="font-mono-data">/setup</span> to create your account.
      </p>
    </>
  );
}

function LoginForm({
  action,
  error,
  pending,
  onBack,
}: {
  action: (payload: FormData) => void;
  error?: string;
  pending: boolean;
  onBack?: () => void;
}) {
  return (
    <>
      {onBack ? (
        <button type="button" onClick={onBack} className="mb-7 flex items-center gap-1.5 text-[13.5px] text-[#5C6B66]">
          ← Back
        </button>
      ) : null}
      <h2 className="font-display mb-2 text-[30px] font-semibold tracking-tight">Sign in</h2>
      <p className="mb-7 text-[14.5px] text-[#5C6B66]">Gynaecological oncology registry account.</p>
      <form action={action} className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="clinician@registry.local"
          defaultValue="clinician@registry.local"
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
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  placeholder?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
