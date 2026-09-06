import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminAccessOutcome } from "@/lib/admin/authorization.server";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const access = await getAdminAccessOutcome();

  if (access.kind === "unauthenticated") {
    redirect("/admin/login");
  }

  if (access.kind === "forbidden") {
    redirect("/admin/unauthorized");
  }

  return <AdminShell context={access.context}>{children}</AdminShell>;
}
