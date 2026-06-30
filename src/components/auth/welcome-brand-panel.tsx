"use client";

import { memo, useEffect, useRef, type ReactNode } from "react";
import { CountUpStat, InfinityStat } from "@/components/auth/count-up-stat";
import { useReducedMotion } from "@/components/auth/use-reduced-motion";

type WelcomeBrandPanelProps = {
  mobileAuthTabs?: ReactNode;
};

function WelcomeBrandPanelInner({ mobileAuthTabs }: WelcomeBrandPanelProps) {
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    const onMove = (e: MouseEvent) => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      parallaxRef.current.tx = -nx * 10;
      parallaxRef.current.ty = -ny * 8;
    };

    let raf = 0;
    const tick = () => {
      const p = parallaxRef.current;
      p.x += (p.tx - p.x) * 0.1;
      p.y += (p.ty - p.y) * 0.1;
      const transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      if (gridRef.current) gridRef.current.style.transform = transform;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${p.x * 0.65}px, ${p.y * 0.65}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const aurora = !reducedMotion ? (
    <>
      <div aria-hidden className="welcome-aurora welcome-aurora-1" />
      <div aria-hidden className="welcome-aurora welcome-aurora-2" />
      <div aria-hidden className="welcome-aurora welcome-aurora-3" />
    </>
  ) : null;

  return (
    <>
      {/* Mobile — full green brand hero */}
      <div className="welcome-brand-panel relative shrink-0 overflow-hidden text-[#EAF2F0] lg:hidden">
        {aurora}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 opacity-80"
        >
          <div className={`welcome-plum-glow h-full w-full rounded-full ${reducedMotion ? "opacity-70" : ""}`} />
        </div>
        <div aria-hidden className="welcome-grid-overlay pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative px-5 pb-6 pt-8">
          <BrandLogo compact />

          <div className="welcome-stagger-item mt-6 font-mono-data text-[10px] tracking-[3px] text-[#C98AAE] uppercase">
            Clinical Data Platform
          </div>
          <h1 className="welcome-stagger-item font-display mt-2 max-w-[16ch] text-[32px] leading-[1.08] font-medium tracking-tight">
            Gynaecological Oncology Registry
          </h1>
          <p className="welcome-stagger-item mt-3 max-w-[36ch] text-[14px] leading-relaxed text-[rgba(234,242,240,0.74)]">
            Structured registry for patient care, MDT review, and research-grade outcomes.
          </p>

          <div className="welcome-stagger-item mt-6 flex gap-5">
            <StatBlock label="Modules">
              <CountUpStat value={11} reducedMotion={reducedMotion} className="font-display text-2xl font-semibold" />
            </StatBlock>
            <div className="h-9 w-px bg-[rgba(234,242,240,0.18)]" />
            <StatBlock label="Exports">
              <CountUpStat value={6} reducedMotion={reducedMotion} className="font-display text-2xl font-semibold" />
            </StatBlock>
            <div className="h-9 w-px bg-[rgba(234,242,240,0.18)]" />
            <StatBlock label="Fields">
              <InfinityStat reducedMotion={reducedMotion} className="font-display text-2xl font-semibold" />
            </StatBlock>
          </div>

          {mobileAuthTabs ? <div className="mt-6">{mobileAuthTabs}</div> : null}

          <div className="mt-5 flex justify-between font-mono-data text-[10px] text-[rgba(234,242,240,0.45)]">
            <span>v2.2 · Final</span>
            <span>Secure · Audit-logged</span>
          </div>
        </div>
      </div>

      {/* Desktop brand panel */}
      <div
        ref={panelRef}
        className="welcome-brand-panel relative hidden w-full shrink-0 flex-col justify-between overflow-hidden p-8 pb-10 text-[#EAF2F0] lg:flex lg:w-[44%] lg:min-w-0 lg:p-14 lg:pb-12 xl:min-w-[460px]"
      >
        {aurora}

        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute -top-[120px] -right-40 h-[520px] w-[520px]"
        >
          <div className={`welcome-plum-glow h-full w-full rounded-full ${reducedMotion ? "opacity-70" : ""}`} />
        </div>

        <div
          ref={gridRef}
          aria-hidden
          className="welcome-grid-overlay pointer-events-none absolute inset-0"
        />

        <div className="welcome-stagger-item relative flex items-center gap-3" style={{ animationDelay: "0.06s" }}>
          <BrandLogo />
        </div>

        <div className="relative">
          <div
            className="welcome-stagger-item font-mono-data mb-5 text-xs tracking-[3px] text-[#C98AAE] uppercase"
            style={{ animationDelay: "0.1s" }}
          >
            Clinical Data Platform
          </div>
          <h1
            className="welcome-stagger-item font-display mb-5 max-w-[14ch] text-[36px] leading-[1.08] font-medium tracking-tight xl:text-[50px]"
            style={{ animationDelay: "0.16s" }}
          >
            Gynaecological Oncology Registry
          </h1>
          <p
            className="welcome-stagger-item max-w-[40ch] text-[16.5px] leading-relaxed text-[rgba(234,242,240,0.74)]"
            style={{ animationDelay: "0.24s" }}
          >
            A structured registry for patient care, multidisciplinary review, and research-grade outcomes — built for
            the people who run the clinic.
          </p>
          <div className="welcome-stagger-item mt-8 flex flex-wrap gap-6 sm:mt-10 sm:gap-8" style={{ animationDelay: "0.32s" }}>
            <StatBlock label="Core modules">
              <CountUpStat
                value={11}
                reducedMotion={reducedMotion}
                className="font-display text-[30px] font-semibold"
              />
            </StatBlock>
            <div className="h-10 w-px bg-[rgba(234,242,240,0.18)]" />
            <StatBlock label="Export formats">
              <CountUpStat value={6} reducedMotion={reducedMotion} className="font-display text-[30px] font-semibold" />
            </StatBlock>
            <div className="h-10 w-px bg-[rgba(234,242,240,0.18)]" />
            <StatBlock label="Custom fields">
              <InfinityStat reducedMotion={reducedMotion} className="font-display text-[30px] font-semibold" />
            </StatBlock>
          </div>
        </div>

        <div
          className="welcome-stagger-item relative flex justify-between text-xs text-[rgba(234,242,240,0.5)]"
          style={{ animationDelay: "0.42s" }}
        >
          <span className="font-mono-data">v2.2 · Final</span>
          <span className="hidden sm:inline">Secure · Audit-logged · Role-based</span>
          <span className="sm:hidden">Secure · Audit-logged</span>
        </div>
      </div>
    </>
  );
}

function BrandLogo({ compact }: { compact?: boolean }) {
  const box = compact ? "h-9 w-9" : "h-[38px] w-[38px]";
  const dot = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-3">
      <div className={`flex ${box} items-center justify-center rounded-[9px] border border-[rgba(234,242,240,0.5)]`}>
        <div className={`relative ${dot} rounded-full border-2 border-[#EAF2F0]`}>
          <div className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#C98AAE]" />
        </div>
      </div>
      <div className="font-mono-data text-xs tracking-[2.5px] text-[rgba(234,242,240,0.78)] uppercase">
        Gyn-Onc Registry
      </div>
    </div>
  );
}

function StatBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div>{children}</div>
      <div className="mt-0.5 text-[11px] text-[rgba(234,242,240,0.6)]">{label}</div>
    </div>
  );
}

export const WelcomeBrandPanel = memo(WelcomeBrandPanelInner);
