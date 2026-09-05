import {
  BadgeCheck,
  BookOpen,
  Building2,
  Images,
  Languages,
  LayoutDashboard,
  MapPin,
  Route,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import {
  getVisibleAdminSections,
  type AdminSection,
} from "@/lib/admin/navigation";
import type { AdminContext } from "@/lib/admin/authorization.server";

const sectionIcons: Record<AdminSection["icon"], LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  "map-pin": MapPin,
  route: Route,
  images: Images,
  "book-open": BookOpen,
  languages: Languages,
  "badge-check": BadgeCheck,
  users: Users,
};

function formatRole(role: string): string {
  return role
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
export function AdminShell({
  children,
  context,
}: Readonly<{ children: ReactNode; context: AdminContext }>) {
  const sections = getVisibleAdminSections(context.staff);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-text-primary">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" href="/admin">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
              <ShieldCheck aria-hidden="true" size={21} />
            </span>
            <span>
              <span className="block text-sm font-extrabold tracking-[0.12em]">
                CITYWALK
              </span>
              <span className="block text-xs text-text-secondary">
                Admin Console
              </span>
            </span>
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8">
        <aside className="surface-card h-fit p-3">
          <div className="border-b border-border px-3 pb-4 pt-2">
            <p className="truncate text-sm font-semibold">{context.user.name}</p>
            <p className="truncate text-xs text-text-secondary">
              {context.user.email}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {formatRole(context.staff.role)}
            </span>
          </div>
          <nav aria-label="Admin sections" className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {sections.map((section) => {
              const Icon = sectionIcons[section.icon];
              return (
                <Link
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-text-secondary transition hover:bg-accent-soft hover:text-primary"
                  href={section.href}
                  key={section.id}
                >
                  <Icon aria-hidden="true" size={18} />
                  {section.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
