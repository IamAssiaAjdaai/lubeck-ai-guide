import "./styles.css";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./PilotApp";
import AuthPreview from "./auth/AuthPreview";
import LandingPage, { LegalStatus } from "./marketing/LandingPage";

const BrandConcepts = lazy(() => import("./brand/BrandConcepts"));
const isBrandConcept = /^\/design\/brand(?:\/(?:kernmut|wirkfaden))?\/?$/.test(
  location.pathname,
);
const root = document.getElementById("root");
if (!root) throw new Error("Marketing onboarding root is missing");
// This is a local UI preview route, NOT an authenticated private route.
const isAuthPreview = window.location.pathname === "/design/auth";
createRoot(root).render(
  <StrictMode>
    {isBrandConcept ? (
      <Suspense
        fallback={
          <main className="pilot-loading" role="status">
            Designkonzepte werden geladen …
          </main>
        }
      >
        <BrandConcepts />
      </Suspense>
    ) : isAuthPreview ? (
      <AuthPreview />
    ) : location.pathname === "/" ? (
      <LandingPage />
    ) : location.pathname === "/rechtliches" ? (
      <LegalStatus />
    ) : (
      <App />
    )}
  </StrictMode>,
);
