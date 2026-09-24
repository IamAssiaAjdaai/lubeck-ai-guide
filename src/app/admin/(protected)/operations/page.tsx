import { Headphones, Languages } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminContentUi";

const operations = [
  {
    href: "/admin/operations/translations",
    title: "Translations",
    description: "See missing and changed language content, then open the existing place editor in one step.",
    icon: Languages,
  },
  {
    href: "/admin/operations/audio",
    title: "Audio",
    description: "Track exact-language narration from draft through review and safe publication.",
    icon: Headphones,
  },
] as const;

export default function ContentOperationsPage() {
  return (
    <section>
      <AdminPageHeader
        description="Find translation and audio work that needs attention without changing the established editorial workflow."
        eyebrow="Content"
        title="Operations"
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {operations.map(({ description, href, icon: Icon, title }) => (
          <Link
            className="surface-card group p-5 transition hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
            href={href}
            key={href}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-primary">
              <Icon aria-hidden="true" size={21} />
            </span>
            <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
