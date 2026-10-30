import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { connection } from "next/server";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminAccessOutcome } from "@/lib/admin/authorization.server";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await connection();
  
  const access = await getAdminAccessOutcome();

  if (access.kind === "unauthenticated") {
    redirect("/admin/login");
  }

  if (access.kind === "forbidden") {
    redirect("/admin/unauthorized");
  }

  return <AdminShell context={access.context}>{children}</AdminShell>;
}
