import { connection } from "next/server";
import { ArrowRight, Building2, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminAccessOutcome } from "@/lib/admin/authorization.server";
import { listAuthorizedCities } from "@/lib/admin/content/service.server";

export const metadata = { title: "CITYWALK CMS" };

export default async function AdminDashboardPage() {
  await connection();

  const access = await getAdminAccessOutcome();
  if (access.kind === "unauthenticated") redirect("/admin/login");
  if (access.kind === "forbidden") redirect("/admin/unauthorized");

  const cities = await listAuthorizedCities();

  return (
    <section>
      <p className="eyebrow">CITYWALK CMS</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Choose a city</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Everything starts with a city. Open one workspace to manage its places, walks, media, languages, marketing, and publishing.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cities.map((city) => {
          const name = city.localizations[0]?.name ?? city.name;
          return (
            <Link className="surface-card group p-6 transition hover:border-primary/30 hover:shadow-md" href={`/admin/cities/${city.id}`} key={city.id}>
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Building2 aria-hidden="true" size={22} /></span>
                <ArrowRight aria-hidden="true" className="text-text-secondary transition group-hover:translate-x-1 group-hover:text-primary" size={20} />
              </div>
              <h2 className="mt-5 text-xl font-extrabold">{name}</h2>
              <p className="mt-1 text-sm text-text-secondary">{city.placeCount} places · {city.tourCount} walks · {city.localizations.length} languages</p>
              <p className="mt-4 text-sm font-bold text-primary">Open city workspace</p>
            </Link>
          );
        })}

        <Link className="surface-card border-dashed p-6 transition hover:border-primary/30" href="/admin/cities/new">
          <span className="rounded-2xl bg-surface-muted p-3 text-text-secondary inline-flex"><Plus aria-hidden="true" size={22} /></span>
          <h2 className="mt-5 text-lg font-extrabold">Add a city</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">Start a new CITYWALK city workspace.</p>
        </Link>
      </div>

      {cities.length === 0 ? (
        <div className="surface-card mt-6 p-6">
          <MapPin aria-hidden="true" className="text-primary" size={22} />
          <h2 className="mt-4 text-lg font-bold">Your first city starts here</h2>
          <p className="mt-2 text-sm text-text-secondary">Add a city, then fill it with places and walks before publishing.</p>
        </div>
      ) : null}
    </section>
  );
}
