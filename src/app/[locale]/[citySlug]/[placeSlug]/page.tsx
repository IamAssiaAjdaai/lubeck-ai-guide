import { Suspense } from "react";

import { GenericPlaceContent, type GenericPlacePageProps } from "./PlacePageContent";

export default function GenericPlacePage(props: GenericPlacePageProps) {
  return (
    <Suspense fallback={<main className="app-shell" />}>
      <GenericPlaceContent {...props} />
    </Suspense>
  );
}
