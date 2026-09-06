import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminAccessOutcome } from "@/lib/admin/authorization.server";

export const metadata = {
  title: "Staff sign in | CITYWALK",
};

export default async function AdminLoginPage() {
  const access = await getAdminAccessOutcome();

  if (access.kind === "authorized") {
    redirect("/admin");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7fb] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-[0_24px_70px_rgba(23,23,23,0.08)] sm:p-9">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-white">
          <ShieldCheck aria-hidden="true" size={25} />
        </span>
        <p className="mt-6 text-xs font-bold tracking-[0.15em] text-primary uppercase">
          CITYWALK Admin
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Staff sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Use your authorized CITYWALK staff account. Traveler accounts do not
          have access to this console.
        </p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
