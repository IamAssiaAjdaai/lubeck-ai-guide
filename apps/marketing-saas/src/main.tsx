import "./styles.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./PilotApp";
import LandingD2 from "./marketing/direction-d2/LandingD2";
import { LegalStatus } from "./marketing/LegalStatus";
import { api } from "./api";
import "./brand/system.css";
import "./marketing/marketing.css";
import "./marketing/direction-d2/landing-d2.css";
import { brandIdentity } from "./brand/identity";
document.title = `${brandIdentity.name} · lokaler geschlossener Pilot`;
function ProductLanding() {
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    let active = true;
    void api<{ user?: unknown } | null>("/api/auth/get-session").then(session => {
      if (active && session?.user) { setRedirecting(true); location.replace("/workspace"); }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return redirecting ? <main role="status">Dein Arbeitsbereich wird geöffnet …</main> : <LandingD2 />;
}
const path = location.pathname;
const root = document.getElementById("root");
if (!root) throw new Error("Marketing root missing");
createRoot(root).render(<StrictMode>{path === "/" ? <ProductLanding /> : path === "/rechtliches" ? <LegalStatus /> : path === "/auth" || path === "/workspace" ? <App /> : <main className="pilot-loading"><h1>Seite nicht verfügbar</h1><p>Diese Vorschau gehört nicht zur aktuellen Anwendung.</p><a href="/">Zur Produktübersicht</a></main>}</StrictMode>);
