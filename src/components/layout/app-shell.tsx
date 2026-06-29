import Link from "next/link";
import { SessionUser, destroySession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { roleLabel } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", permission: null },
  { href: "/patients", label: "Patients", permission: "patients:read" as const },
  { href: "/patients/new", label: "Register Patient", permission: "patients:create" as const },
  { href: "/reports", label: "Research export", permission: "reports:read" as const },
  { href: "/dictionary", label: "Data dictionary", permission: "reports:read" as const },
  { href: "/admin/users", label: "Users", permission: "admin:users" as const },
  { href: "/admin/audit", label: "Audit Log", permission: "admin:audit" as const },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-teal-800">Zimbabwe Gyn Onc Registry</p>
            <p className="text-xs text-slate-500">Parirenyatwa · Research-ready prospective registry</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-slate-800">{user.name}</p>
            <p className="text-slate-500">{roleLabel(user.role)}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1">
            {navItems
              .filter((item) => !item.permission || hasPermission(user.role, item.permission))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-white hover:text-teal-800"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
          <form action="/api/auth/logout" method="POST" className="mt-6">
            <Button type="submit" variant="secondary" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
