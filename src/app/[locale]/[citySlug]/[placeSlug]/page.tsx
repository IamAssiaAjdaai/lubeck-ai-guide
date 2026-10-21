import { Suspense } from "react";
import { GenericPlaceContent } from "./content";

export default function GenericPlacePage(props: Parameters<typeof GenericPlaceContent>[0]) {
  return (
    <Suspense fallback={<main className="app-shell" />}>
      <GenericPlaceContent {...props} />
    </Suspense>
  );
}
