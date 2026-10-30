import { AdminSecurityManager } from "@/components/admin/AdminSecurityManager";
import { AdminPageHeader } from "@/components/admin/AdminContentUi";
import { requireStaff } from "@/lib/admin/authorization.server";
import { getAdminSecurityStatus } from "@/lib/admin/security.server";

export const metadata = { title: "Security | CITYWALK Control Center" };

export default async function AdminSecurityPage() {
  const context = await requireStaff();
  const status = await getAdminSecurityStatus(context.user.id);

  return (
    <section>
      <AdminPageHeader
        description="Use a passkey for everyday staff access and protect the password fallback with an authenticator."
        eyebrow="Account security"
        title="Security"
      />
      <AdminSecurityManager initialTwoFactorEnabled={status.twoFactorEnabled} />
    </section>
  );
}