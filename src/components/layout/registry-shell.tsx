"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/patients", label: "Patients", icon: "❏", badgeKey: "patients" as const },
  { href: "/patients/new", label: "New patient", icon: "＋" },
  { href: "/builder", label: "Module builder", icon: "⚙", modulesOnly: true as const },
  { href: "/reports", label: "Export & research", icon: "⤓" },
  { href: "/admin", label: "Admin", icon: "☷", adminOnly: true },
];

export function RegistryShell({
  user,
  patientsBadge,
  children,
}: {
  user: SessionUser;
  patientsBadge?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [navOpen, setNavOpen] = useState(false);

  const isAdmin = user.role === "ADMIN";
  const canManageModules = user.role === "ADMIN" || user.role === "CLINICIAN";

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/patients")
      return pathname === "/patients" || (pathname.startsWith("/patients/") && !pathname.startsWith("/patients/new"));
    if (href === "/patients/new") return pathname === "/patients/new";
    if (href === "/admin") return pathname.startsWith("/admin");
    if (href === "/reports") return pathname === "/reports";
    return pathname === href;
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/patients?q=${encodeURIComponent(q)}` : "/patients");
  }

  const pageMeta = pageTitle(pathname);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navItems = NAV.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if ("modulesOnly" in item && item.modulesOnly && !canManageModules) return false;
    return true;
  });

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F4F1EB] text-[#1A2421]">
      {navOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col bg-gradient-to-b from-[#0C4F4E] to-[#0A3C3D] px-4 py-[22px] text-[#EAF2F0] transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[248px] lg:shrink-0 lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 pb-[22px]">
          <div className="flex items-center gap-3">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-[rgba(234,242,240,0.5)]">
              <div className="relative h-[13px] w-[13px] rounded-full border-2 border-[#EAF2F0]">
                <div className="absolute -top-[3px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#C98AAE]" />
              </div>
            </div>
            <div>
              <div className="font-mono-data text-[11px] font-medium tracking-widest">GYN-ONC</div>
              <div className="text-[11px] text-[rgba(234,242,240,0.55)]">Registry</div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-[rgba(234,242,240,0.7)] lg:hidden"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="mt-1.5 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            if ("disabled" in item && item.disabled) {
              return (
                <div
                  key={item.label}
                  className="flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-[rgba(234,242,240,0.4)]"
                  title="Coming in v2"
                >
                  <span className="w-5 text-center text-[15px] opacity-90">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px]">Soon</span>
                </div>
              );
            }
            const active = isActive(item.href);
            const badge = item.badgeKey === "patients" && patientsBadge ? patientsBadge : null;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[rgba(234,242,240,0.14)] font-semibold text-white"
                    : "text-[rgba(234,242,240,0.72)] hover:bg-[rgba(234,242,240,0.08)]"
                }`}
              >
                <span className="w-5 text-center text-[15px] opacity-90">{item.icon}</span>
                <span>{item.label}</span>
                {badge ? (
                  <span className="ml-auto rounded-full bg-[#7A3B5E] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-[rgba(234,242,240,0.14)] pt-3.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#14807E] text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{user.name}</div>
            <div className="text-[11.5px] text-[rgba(234,242,240,0.55)]">Registry Clinician</div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="min-h-[44px] min-w-[44px] text-[rgba(234,242,240,0.6)]" title="Sign out">
              ⏻
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[#E7E2D7] bg-[rgba(244,241,235,0.92)] px-4 py-3 backdrop-blur-sm sm:px-6 lg:flex lg:h-[70px] lg:items-center lg:gap-5 lg:px-8 lg:py-0">
          <div className="flex items-center gap-3 lg:h-full">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E2DDD3] bg-white text-lg lg:hidden"
              aria-label="Open menu"
              onClick={() => setNavOpen(true)}
            >
              ☰
            </button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="font-display truncate text-lg font-semibold leading-tight tracking-tight sm:text-[21px]">
                {pageMeta.title}
              </div>
              <div className="truncate text-[12px] text-[#7C8983] sm:text-[12.5px]">{pageMeta.sub}</div>
            </div>
          </div>
          <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:mt-0 lg:w-auto lg:shrink-0 lg:gap-3">
            <form onSubmit={onSearchSubmit} className="relative w-full sm:flex-1 lg:w-auto">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa5a0]">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients…"
                className="rg-input h-11 w-full rounded-[10px] border-[1.5px] border-[#E2DDD3] bg-white py-0 pr-3.5 pl-9 text-base sm:h-10 sm:text-[13.5px] lg:w-[320px]"
              />
            </form>
            <div className="hidden h-10 shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[#D5E4E2] bg-[#ECF3F2] px-3 text-[12.5px] font-medium text-[#0C4F4E] md:flex">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#1F8A5B]" />
              <span className="truncate">Parirenyatwa Group of Hospitals</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-[30px] lg:px-8 lg:pb-[60px]">
          {children}
        </main>
      </div>
    </div>
  );
}

function pageTitle(pathname: string) {
  if (pathname === "/dashboard") return { title: "Dashboard", sub: "Overview of registry activity" };
  if (pathname === "/patients") return { title: "Patients", sub: "Search and open patient charts" };
  if (pathname === "/patients/new") return { title: "New patient", sub: "Register a new registry case" };
  if (pathname.startsWith("/patients/")) return { title: "Patient record", sub: "Clinical modules and audit trail" };
  if (pathname === "/reports") return { title: "Export & research", sub: "De-identified data export" };
  if (pathname === "/builder") return { title: "Module builder", sub: "Add and edit custom registry modules" };
  if (pathname.startsWith("/admin")) return { title: "Admin", sub: "Invites, users, and audit" };
  return { title: "Registry", sub: "" };
}
