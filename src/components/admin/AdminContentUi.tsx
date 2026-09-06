import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPageHeader({
  actionHref,
  actionLabel,
  description,
  eyebrow,
  title,
}: Readonly<{
  actionHref?: string;
  actionLabel?: string;
  description: string;
  eyebrow: string;
  title: string;
}>) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {actionHref && actionLabel ? <Link className="button-primary min-h-11 px-5" href={actionHref}>{actionLabel}</Link> : null}
    </header>
  );
}

export function ContentTable({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="surface-card mt-6 overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm">{children}</table></div>;
}

export function TableHead({ children }: Readonly<{ children: ReactNode }>) {
  return <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-text-secondary"><tr>{children}</tr></thead>;
}

export function HeaderCell({ children }: Readonly<{ children: ReactNode }>) {
  return <th className="px-4 py-3 font-bold">{children}</th>;
}

export function Cell({ children }: Readonly<{ children: ReactNode }>) {
  return <td className="border-b border-border px-4 py-4 align-top">{children}</td>;
}

export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const color = status === "published" || status === "open" ? "bg-emerald-50 text-emerald-700" : status === "archived" || status === "closed" || status === "renovation" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{status}</span>;
}

export function EmptyContent({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="surface-card mt-6 p-8 text-center text-sm text-text-secondary">{children}</div>;
}
