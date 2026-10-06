"use client";

import { useEffect } from "react";

export function NativeAppFallback({
  schemeHref,
  iosStoreUrl,
  androidStoreUrl,
}: Readonly<{
  schemeHref: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
}>) {
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(userAgent);
    if (!isMobile) return;

    const timeout = window.setTimeout(() => {
      window.location.href = schemeHref;
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [schemeHref]);

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <a
        href={schemeHref}
        className="button-primary inline-flex min-h-12 items-center justify-center px-6"
      >
        Open CITYWALK
      </a>
      {iosStoreUrl ? (
        <a
          href={iosStoreUrl}
          className="button-secondary inline-flex min-h-12 items-center justify-center px-6"
          rel="noreferrer"
        >
          App Store
        </a>
      ) : null}
      {androidStoreUrl ? (
        <a
          href={androidStoreUrl}
          className="button-secondary inline-flex min-h-12 items-center justify-center px-6"
          rel="noreferrer"
        >
          Google Play
        </a>
      ) : null}
    </div>
  );
}
