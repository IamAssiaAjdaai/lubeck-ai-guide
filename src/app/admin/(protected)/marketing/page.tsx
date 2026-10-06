import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Megaphone, Newspaper, Plus, Sparkles } from "lucide-react";

import {
  AdminPageHeader,
  Cell,
  ContentTable,
  EmptyContent,
  HeaderCell,
  StatusBadge,
  TableHead,
} from "@/components/admin/AdminContentUi";
import { getMarketingWorkspace } from "@/lib/admin/marketing/service.server";
import { createLubeckStarterCampaignAction } from "./actions";

function MetricCard({
  label,
  value,
  detail,
}: Readonly<{ label: string; value: number; detail: string }>) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-5 text-text-secondary">{detail}</p>
    </div>
  );
}

function NewDraftLink({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link className="button-secondary inline-flex min-h-10 items-center gap-2 px-4" href={href}>
      <Plus aria-hidden="true" size={16} />
      {label}
    </Link>
  );
}

export const metadata = {
  title: "Marketing | CITYWALK Control Center",
};

export default async function MarketingPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ city?: string }>;
}>) {
  const [query, workspace] = await Promise.all([
    searchParams,
    getMarketingWorkspace(),
  ]);
  const city = query.city
    ? workspace.cities.find(({ slug }) => slug === query.city)
    : undefined;
  if (query.city && !city) notFound();

  const campaigns = city
    ? workspace.campaigns.filter((campaign) => campaign.cityId === city.id)
    : workspace.campaigns;
  const pages = city
    ? workspace.pages.filter((page) => page.cityId === city.id)
    : workspace.pages;
  const content = city
    ? workspace.content.filter((item) => item.cityId === city.id)
    : workspace.content;
  const counts = {
    campaigns: campaigns.length,
    activeCampaigns: campaigns.filter(({ status }) => status === "active").length,
    pages: pages.length,
    publishedPages: pages.filter(({ publicationStatus }) => publicationStatus === "published").length,
    content: content.length,
    readyContent: content.filter(({ status }) => status === "ready").length,
  };
  const citySuffix = city ? `?city=${encodeURIComponent(city.slug)}` : "";
  const hasLubeckStarter = campaigns.some(
    ({ slug }) => slug === "two-hours-in-lubeck",
  );
  const canCreateLubeckStarter =
    workspace.canManage &&
    !hasLubeckStarter &&
    (!city || city.slug === "lubeck") &&
    workspace.cities.some(({ slug }) => slug === "lubeck");

  return (
    <section>
      {city ? (
        <Link
          className="text-sm font-semibold text-primary hover:underline"
          href={`/admin/cities/${city.id}`}
        >
          ← {city.name}
        </Link>
      ) : null}
      <AdminPageHeader
        description={city
          ? `Campaigns, landing/blog pages and social content for ${city.name}. The city context stays attached while you work.`
          : "Plan campaigns, landing/blog pages and social content from verified CITYWALK city content. Drafting stays human-controlled; nothing auto-publishes."}
        eyebrow={city ? "City workspace · Growth" : "Growth workspace"}
        title={city ? `${city.name} Marketing` : "Marketing"}
      />

      {workspace.canManage ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <NewDraftLink href={`/admin/marketing/campaigns/new${citySuffix}`} label="New campaign" />
          <NewDraftLink href={`/admin/marketing/pages/new${citySuffix}`} label="New page" />
          <NewDraftLink href={`/admin/marketing/social/new${citySuffix}`} label="New social draft" />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail={`${counts.activeCampaigns} active`}
          label="Campaigns"
          value={counts.campaigns}
        />
        <MetricCard
          detail={`${counts.publishedPages} published`}
          label="Landing + blog"
          value={counts.pages}
        />
        <MetricCard
          detail={`${counts.readyContent} ready to publish`}
          label="Social content"
          value={counts.content}
        />
        <MetricCard
          detail={city ? city.name : "City-scoped source of truth"}
          label={city ? "City scope" : "Available cities"}
          value={city ? 1 : workspace.cities.length}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="surface-card p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-primary">
            <Megaphone aria-hidden="true" size={19} />
          </span>
          <h2 className="mt-4 text-lg font-extrabold">Campaigns</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            One campaign stores the objective, audience, message and CTA before content gets produced.
          </p>
        </article>
        <article className="surface-card p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <FileText aria-hidden="true" size={19} />
          </span>
          <h2 className="mt-4 text-lg font-extrabold">Pages</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Landing pages and blog articles keep their own SEO, CTA and publishing workflow.
          </p>
        </article>
        <article className="surface-card p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800">
            <Sparkles aria-hidden="true" size={19} />
          </span>
          <h2 className="mt-4 text-lg font-extrabold">Social</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Hooks, scripts and captions stay tied to a stable content code for attribution later.
          </p>
        </article>
      </div>

      {!workspace.canManage ? (
        <p className="mt-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
          You have read-only Marketing access. Editors and admins manage drafts; review/publish controls arrive in the next workflow checkpoint.
        </p>
      ) : null}

      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Campaigns</p>
          <h2 className="mt-2 text-2xl font-extrabold">Campaign workspace</h2>
        </div>
        <span className="text-xs font-semibold text-text-secondary">
          {counts.campaigns} total
        </span>
      </div>
      {campaigns.length === 0 ? (
        <div className="surface-card mt-6 p-6 sm:p-8">
          <p className="eyebrow">First CITYWALK campaign</p>
          <h3 className="mt-2 text-xl font-extrabold">2 Hours in Lübeck</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Creates one draft campaign, the <strong>/lubeck/2-hours</strong> landing page and the first short-form content draft <strong>CW-LUB-TIME-001</strong>. Nothing is published automatically.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {canCreateLubeckStarter ? (
              <form action={createLubeckStarterCampaignAction}>
                <button className="button-primary min-h-11 px-5" type="submit">
                  Create starter campaign
                </button>
              </form>
            ) : null}
            {workspace.canManage ? (
              <NewDraftLink href={`/admin/marketing/campaigns/new${citySuffix}`} label="Create another campaign" />
            ) : null}
          </div>
          {!canCreateLubeckStarter && !workspace.canManage ? (
            <p className="mt-4 text-sm font-semibold text-text-secondary">
              Marketing edit access is required to create campaigns.
            </p>
          ) : null}
        </div>
      ) : (
        <ContentTable>
          <TableHead>
            <HeaderCell>Campaign</HeaderCell>
            {!city ? <HeaderCell>City</HeaderCell> : null}
            <HeaderCell>Objective</HeaderCell>
            <HeaderCell>Status</HeaderCell>
          </TableHead>
          <tbody>
            {campaigns.slice(0, 8).map((campaign) => (
              <tr key={campaign.id}>
                <Cell>
                  <Link className="font-bold text-primary hover:underline" href={`/admin/marketing/campaigns/${campaign.id}`}>
                    {campaign.name}
                  </Link>
                  <span className="mt-1 block text-xs text-text-secondary">
                    {campaign.slug}
                  </span>
                </Cell>
                {!city ? <Cell>{campaign.cityName}</Cell> : null}
                <Cell>{campaign.objective}</Cell>
                <Cell>
                  <StatusBadge status={campaign.status} />
                </Cell>
              </tr>
            ))}
          </tbody>
        </ContentTable>
      )}

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Newspaper aria-hidden="true" className="text-primary" size={20} />
              <div>
                <p className="eyebrow">Pages</p>
                <h2 className="mt-1 text-xl font-extrabold">Landing + blog</h2>
              </div>
            </div>
            {workspace.canManage ? (
              <Link className="text-sm font-semibold text-primary hover:underline" href={`/admin/marketing/pages/new${citySuffix}`}>
                New page
              </Link>
            ) : null}
          </div>
          {pages.length === 0 ? (
            <EmptyContent>No marketing pages yet.</EmptyContent>
          ) : (
            <ContentTable>
              <TableHead>
                <HeaderCell>Page</HeaderCell>
                <HeaderCell>Kind</HeaderCell>
                <HeaderCell>Status</HeaderCell>
              </TableHead>
              <tbody>
                {pages.slice(0, 6).map((page) => (
                  <tr key={page.id}>
                    <Cell>
                      <Link className="font-bold text-primary hover:underline" href={`/admin/marketing/pages/${page.id}`}>
                        {page.title}
                      </Link>
                      <span className="mt-1 block text-xs text-text-secondary">
                        {page.path}
                      </span>
                    </Cell>
                    <Cell>{page.kind}</Cell>
                    <Cell>
                      <StatusBadge status={page.publicationStatus} />
                    </Cell>
                  </tr>
                ))}
              </tbody>
            </ContentTable>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles aria-hidden="true" className="text-primary" size={20} />
              <div>
                <p className="eyebrow">Social</p>
                <h2 className="mt-1 text-xl font-extrabold">Content pipeline</h2>
              </div>
            </div>
            {workspace.canManage ? (
              <Link className="text-sm font-semibold text-primary hover:underline" href={`/admin/marketing/social/new${citySuffix}`}>
                New draft
              </Link>
            ) : null}
          </div>
          {content.length === 0 ? (
            <EmptyContent>No social content drafts yet.</EmptyContent>
          ) : (
            <ContentTable>
              <TableHead>
                <HeaderCell>Content</HeaderCell>
                <HeaderCell>Platform</HeaderCell>
                <HeaderCell>Status</HeaderCell>
              </TableHead>
              <tbody>
                {content.slice(0, 6).map((item) => (
                  <tr key={item.id}>
                    <Cell>
                      <Link className="font-bold text-primary hover:underline" href={`/admin/marketing/social/${item.id}`}>
                        {item.contentCode}
                      </Link>
                      <span className="mt-1 block max-w-xs text-xs text-text-secondary">
                        {item.hook}
                      </span>
                    </Cell>
                    <Cell>
                      {item.platform} · {item.format}
                    </Cell>
                    <Cell>
                      <StatusBadge status={item.status} />
                    </Cell>
                  </tr>
                ))}
              </tbody>
            </ContentTable>
          )}
        </div>
      </div>
    </section>
  );
}
