"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import en from "@/translations/en.json";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      posthog.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main>
          <h1>{en.common.appName}</h1>
          <p>{en.ai.unavailable}</p>
        </main>
      </body>
    </html>
  );
}
