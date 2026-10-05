import {
  BadgeCheck,
  Building2,
  Images,
  Languages,
  MapPin,
  Route,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminAccessOutcome } from "@/lib/admin/authorization.server";
import {
  listAuthorizedCities,
  listAuthorizedPlaces,
  listAuthorizedTours,
} from "@/lib/admin/content/service.server";
import { hasActiveStaffCapability } from "@/lib/admin/permissions";

export const metadata = { title: "Dashboard | CITYWALK Control Center" };

export default async function AdminDashboardPage() {
  const access = await getAdminAccessOutcome();

  if (access.kind === "unauthenticated") {
    redirect("/admin/login");
  }

  if (access.kind === "forbidden") {
    redirect("/admin/unauthorized");
  }

  const { staff } = access.context;
  const [cities, places, tours] = await Promise.all([
    listAuthorizedCities(),
    listAuthorizedPlaces(),
    listAuthorizedTours(),
  ]);
  const reviewCount =
    cities.filter(({ publicationStatus }) => publicationStatus === "in_review").length +
    places.filter(({ publicationStatus }) => publicationStatus === "in_review").length +
    tours.filter(({ publicationStatus }) => publicationStatus === "in_review").length;

  const cards = [
    { title: "Cities", value: cities.length, icon: Building2 },
    { title: "Places", value: places.length, icon: MapPin },
    { title: "Curated tours", value: tours.length, icon: Route },
    { title: "Waiting for review", value: reviewCount, icon: BadgeCheck },
  ];
  const quickLinks = [
    {
      href: "/admin/cities",
      title: "City workspaces",
      description: "Open a city and manage its content, media and launch readiness.",
      icon: Building2,
      visible: true,
    },
    {
      href: "/admin/review",
      title: "Review queue",
      description: "Review editorial work that is ready for a publishing decision.",
      icon: BadgeCheck,
      visible: hasActiveStaffCapability(staff, "publishing:review"),
    },
    {
      href: "/admin/operations",
      title: "Content operations",
      description: "See translation and exact-language audio work that needs attention.",
      icon: Languages,
      visible: hasActiveStaffCapability(staff, "translations:view"),
    },
    {
      href: "/admin/media",
      title: "Media library",
      description: "Prepare, review and reuse city-scoped images, audio and video.",
      icon: Images,
      visible: hasActiveStaffCapability(staff, "media:view"),
    },
  ].filter(({ visible }) => visible);

  return (
    <section>
      <p className="eyebrow">CITYWALK Control Center</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Content overview
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Start with a city, see what needs attention, and move content safely
        from draft to traveler-facing publication.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, title, value }) => (
          <article className="surface-card p-5" key={title}>
            <Icon aria-hidden="true" className="text-primary" size={21} />
            <p className="mt-5 text-xs font-semibold text-text-secondary">
              {title}
            </p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </article>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Cities</p>
            <h2 className="mt-2 text-xl font-extrabold">Choose a workspace</h2>
          </div>
          <Link className="text-sm font-bold text-primary" href="/admin/cities">
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cities.map((city) => (
            <Link
              className="surface-card p-5 transition hover:border-primary/30 hover:shadow-md"
              href={`/admin/cities/${city.id}`}
              key={city.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">
                    {city.localizations[0]?.name ?? city.name}
                  </h3>
                  <p className="mt-1 text-xs text-text-secondary">{city.slug}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
                  {city.publicationStatus.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-5 text-sm text-text-secondary">
                {city.placeCount} places · {city.tourCount} tours · {city.localizations.length} locales
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="eyebrow">Workflows</p>
        <h2 className="mt-2 text-xl font-extrabold">What needs attention</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {quickLinks.map(({ description, href, icon: Icon, title }) => (
            <Link
              className="surface-card group p-5 transition hover:border-primary/30 hover:shadow-md"
              href={href}
              key={href}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-primary">
                <Icon aria-hidden="true" size={21} />
              </span>
              <h3 className="mt-4 font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
