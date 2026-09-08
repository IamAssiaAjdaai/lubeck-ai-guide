import { redirect } from "next/navigation";

import { getAdminCapabilityOutcome } from "@/lib/admin/authorization.server";
import {
  formatMinorCurrency,
  getAdminCommerceOverview,
} from "@/lib/commerce/queries.server";

export default async function AdminCommercePage() {
  const access = await getAdminCapabilityOutcome("commerce:view");
  if (access.kind === "unauthenticated") redirect("/admin/login");
  if (access.kind === "forbidden") {
    redirect("/admin/unauthorized?reason=capability");
  }

  const overview = await getAdminCommerceOverview();

  return (
    <section>
      <p className="eyebrow">Commerce</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
        Payments & entitlements
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Read-only payment and access status. CITYWALK never stores full card
        numbers or CVC values.
      </p>

      <section className="surface-card mt-7 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold">Recent orders</h2>
        </div>
        {overview.orders.length === 0 ? (
          <p className="p-5 text-sm text-text-secondary">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Traveler</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                    <td className="px-4 py-3">{order.userEmail ?? "Deleted account"}</td>
                    <td className="px-4 py-3">{order.productName}</td>
                    <td className="px-4 py-3">{order.status}</td>
                    <td className="px-4 py-3">
                      {formatMinorCurrency(order.amountTotal, order.currency, "en")}
                    </td>
                    <td className="px-4 py-3">{order.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold">Entitlements</h2>
        </div>
        {overview.entitlements.length === 0 ? (
          <p className="p-5 text-sm text-text-secondary">No entitlements yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-4 py-3">Traveler</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.entitlements.map((entitlement) => (
                  <tr key={entitlement.id}>
                    <td className="px-4 py-3">{entitlement.userEmail ?? "Deleted account"}</td>
                    <td className="px-4 py-3">{entitlement.productName}</td>
                    <td className="px-4 py-3">
                      {entitlement.scopeType}:{entitlement.scopeKey}
                    </td>
                    <td className="px-4 py-3">{entitlement.status}</td>
                    <td className="px-4 py-3">
                      {entitlement.expiresAt
                        ? entitlement.expiresAt.toISOString().slice(0, 10)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
