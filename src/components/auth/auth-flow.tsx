"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions";

type Step = "welcome" | "signin";

export function AuthFlow({ error }: { error?: string }) {
  const [step, setStep] = useState<Step>("welcome");

  const stepIndex = step === "welcome" ? 0 : 1;

  return (
    <div className="flex min-h-screen overflow-hidden">
      <BrandPanel />

      <div className="relative flex flex-1 items-center justify-center p-10">
        <div className="absolute top-[30px] right-[38px] flex items-center gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-1 rounded-sm transition-all duration-300"
              style={{
                width: i === stepIndex ? 28 : 12,
                background: i <= stepIndex ? "#0C4F4E" : "#E2DDD3",
              }}
            />
          ))}
        </div>

        {step === "welcome" ? (
          <div className="w-full max-w-[400px]">
            <div className="font-mono-data mb-4 text-xs tracking-[2px] text-[#7A3B5E] uppercase">Welcome</div>
            <h2 className="font-display mb-3.5 text-[34px] leading-tight font-semibold tracking-tight">
              Sign in to the registry
            </h2>
            <p className="mb-9 text-[15.5px] leading-relaxed text-[#5C6B66]">
              Access is restricted to authorised clinical and research staff. All activity is recorded in the audit
              trail.
            </p>
            <button
              type="button"
              onClick={() => setStep("signin")}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#0C4F4E] text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(12,79,78,0.65)] transition hover:translate-y-[-1px]"
            >
              Continue to sign in <span>→</span>
            </button>
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E2DDD3]" />
              <span className="text-xs text-[#9aa5a0]">or</span>
              <div className="h-px flex-1 bg-[#E2DDD3]" />
            </div>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex h-[50px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#DDD7CB] bg-white text-[15px] font-medium text-[#9aa5a0] opacity-70"
            >
              <span className="inline-block h-[18px] w-[18px] rounded border-[1.5px] border-[#7A3B5E]" />
              Continue with hospital SSO
              <span className="text-xs">(Coming soon)</span>
            </button>
            <p className="mt-8 text-[12.5px] leading-relaxed text-[#9aa5a0]">
              Need access? Contact your registry administrator. Unauthorised access is prohibited.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[400px]">
            <button
              type="button"
              onClick={() => setStep("welcome")}
              className="mb-7 flex items-center gap-1.5 text-[13.5px] text-[#5C6B66]"
            >
              ← Back
            </button>
            <h2 className="font-display mb-2 text-[30px] font-semibold tracking-tight">Staff sign in</h2>
            <p className="mb-7 text-[14.5px] text-[#5C6B66]">Enter your registry credentials to continue.</p>
            <form action={loginAction} className="space-y-5">
              <div>
                <label className="mb-2 block text-[12.5px] font-semibold tracking-wide text-[#45524D]">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. clinician@registry.local"
                  className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] bg-white px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-[12.5px] font-semibold tracking-wide text-[#45524D]">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] bg-white px-3.5 text-sm"
                />
              </div>
              {error ? (
                <div className="rounded-[9px] border border-[#F2D6D6] bg-[#FBEEEE] px-3.5 py-2.5 text-[13px] text-[#B23A48]">
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                className="flex h-[54px] w-full items-center justify-center rounded-xl bg-[#0C4F4E] text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(12,79,78,0.65)]"
              >
                Sign in
              </button>
            </form>
            <p className="mt-5 text-center text-xs text-[#9aa5a0]">
              Need an account? Ask your registry administrator for an invite link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div
      className="relative flex w-[44%] min-w-[460px] shrink-0 flex-col justify-between overflow-hidden p-14 pb-12 text-[#EAF2F0]"
      style={{
        background: "radial-gradient(120% 90% at 18% 12%, #14706E 0%, #0C4F4E 46%, #0A3C3D 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-[120px] -right-40 h-[520px] w-[520px] rounded-full opacity-60"
        style={{ background: "radial-gradient(circle, rgba(122,59,94,.55), transparent 70%)" }}
      />
      <div className="relative flex items-center gap-3">
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-[rgba(234,242,240,0.5)]">
          <div className="relative h-3.5 w-3.5 rounded-full border-2 border-[#EAF2F0]">
            <div className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#C98AAE]" />
          </div>
        </div>
        <div className="font-mono-data text-xs tracking-[2.5px] text-[rgba(234,242,240,0.78)] uppercase">
          Gyn-Onc Registry
        </div>
      </div>
      <div className="relative">
        <div className="font-mono-data mb-5 text-xs tracking-[3px] text-[#C98AAE] uppercase">Clinical Data Platform</div>
        <h1 className="font-display mb-5 max-w-[14ch] text-[50px] leading-[1.08] font-medium tracking-tight">
          Gynaecological Oncology Registry
        </h1>
        <p className="max-w-[40ch] text-[16.5px] leading-relaxed text-[rgba(234,242,240,0.74)]">
          A structured registry for patient care, multidisciplinary review, and research-grade outcomes — built for the
          people who run the clinic.
        </p>
        <div className="mt-10 flex gap-8">
          {[
            ["11", "Core modules"],
            ["6", "Export formats"],
            ["∞", "Custom fields"],
          ].map(([n, l], i) => (
            <div key={l} className="flex items-center gap-8">
              {i > 0 ? <div className="h-10 w-px bg-[rgba(234,242,240,0.18)]" /> : null}
              <div>
                <div className="font-display text-[30px] font-semibold">{n}</div>
                <div className="mt-0.5 text-[12.5px] text-[rgba(234,242,240,0.6)]">{l}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex justify-between text-xs text-[rgba(234,242,240,0.5)]">
        <span className="font-mono-data">v2.2 · Final</span>
        <span>Secure · Audit-logged · Role-based</span>
      </div>
    </div>
  );
}
