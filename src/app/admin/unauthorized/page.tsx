import { ShieldX } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { getAdminAccessOutcome } from "@/lib/admin/authorization.server";

export const metadata = { title: "Access denied | CITYWALK" };

export default async function AdminUnauthorizedPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { reason } = await searchParams;
  const access = await getAdminAccessOutcome();

  if (access.kind === "unauthenticated") {
    redirect("/admin/login");
  }

  if (access.kind === "authorized" && reason !== "capability") {
    redirect("/admin");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7fb] px-4 py-10">
      <section className="surface-card w-full max-w-md p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
          <ShieldX aria-hidden="true" size={25} />
        </span>
        <p className="mt-5 text-sm font-bold text-red-700">403 Forbidden</p>
        <h1 className="mt-2 text-2xl font-extrabold">Staff access required</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          {access.kind === "authorized"
            ? "Your staff role does not permit access to that section."
            : "This signed-in account does not have an active CITYWALK staff membership."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link className="button-secondary" href="/">
            Return to CITYWALK
          </Link>
          <AdminLogoutButton />
        </div>
      </section>
    </main>
  );
}
