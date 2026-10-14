"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedRoute } from "@citywalk/traveler-core";
import { saveWalk } from "@/lib/walk/storage";

export default function StartSharedWalk({ route, cityName, locale, shareId }: {
  route: SavedRoute; cityName: string; locale: string; shareId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(false);
  return (
    <div className="mt-8">
      <button type="button" className="button-primary" onClick={() => {
        const id = `shared-${shareId}`;
        const saved = saveWalk({
          id,
          citySlug: route.citySlug,
          cityName,
          placeSlugs: [...route.stopSlugs],
          minutes: route.settings.minutes,
          distance: 0,
          savedAt: Date.now(),
          settings: { ...route.settings, deadline: undefined },
        });
        if (!saved) { setError(true); return; }
        router.push(`/${locale}/${route.citySlug}?walk=${encodeURIComponent(id)}#build-walk`);
      }}>
        Preview and start this walk
      </button>
      <p className="mt-2 text-sm opacity-70">No account required. Review the route, then tap Start walk. Your progress stays separate.</p>
      {error ? <p role="alert">Unable to prepare this walk on this device. Check browser storage settings and try again.</p> : null}
    </div>
  );
}
