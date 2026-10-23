import { Suspense } from "react";

import { GenericCityContent, type GenericCityPageProps } from "./CityPageContent";

export default function GenericCityPage(props: GenericCityPageProps) {
  return (
    <Suspense fallback={<main className="app-shell" />}>
      <GenericCityContent {...props} />
    </Suspense>
  );
}
