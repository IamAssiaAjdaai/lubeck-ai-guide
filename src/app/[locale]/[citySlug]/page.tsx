import { Suspense } from "react";
import { GenericCityContent } from "./content";

export default function GenericCityPage(props: Parameters<typeof GenericCityContent>[0]) {
  return (
    <Suspense fallback={<main className="app-shell" />}>
      <GenericCityContent {...props} />
    </Suspense>
  );
}
