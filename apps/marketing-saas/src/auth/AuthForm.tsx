import { useState, type FormEvent } from "react";
import { api } from "../api";
import "./auth.css";
import BrandIdentity, { BrandMark } from "../brand/BrandIdentity";
import { brandIdentity } from "../brand/identity";
export default function AuthForm({
  onSignedIn,
}: {
  onSignedIn: () => Promise<void>;
}) {
  const token = new URLSearchParams(location.search).get("token");
  const [view, setView] = useState<"signup" | "signin" | "forgot" | "reset">(
    token ? "reset" : "signin",
  );
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const email = String(fields.get("email") ?? "")
        .trim()
        .toLowerCase();
      const password = String(fields.get("password") ?? "");
      if (view === "signup") {
        await api("/api/auth/sign-up/email", {
          name: String(fields.get("name")),
          email,
          password,
          callbackURL: location.origin + "/auth",
        });
        setNotice(
          "Bitte bestätige deine E-Mail-Adresse. Im lokalen Test liegt der Link im geschützten QA-Mailordner.",
        );
        form.reset();
      } else if (view === "signin") {
        await api("/api/auth/sign-in/email", { email, password });
        await onSignedIn();
      } else if (view === "forgot") {
        await api("/api/auth/request-password-reset", {
          email,
          redirectTo: location.origin + "/auth",
        });
        setNotice(
          "Falls ein Konto existiert, wurde ein Link im lokalen QA-Mailordner abgelegt.",
        );
        form.reset();
      } else {
        await api("/api/auth/reset-password", { token, newPassword: password });
        history.replaceState(null, "", "/auth");
        setView("signin");
        setNotice("Dein Passwort wurde geändert. Bitte neu anmelden.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  function go(next: typeof view) {
    setView(next);
    setError("");
    setNotice("");
  }
  return (
    <main className="pilot-auth">
      <a className="auth-back-link" href="/">
        ← Zur Produktübersicht
      </a>
      <div className="auth-card">
        <section className="auth-story">
          <div className="auth-story-brand">
            <BrandIdentity />
          </div>
          <div className="auth-story-center">
            <p>DEIN MARKETING. DEIN UNTERNEHMEN.</p>
            <h2>{brandIdentity.headline}</h2>
            <p>
              Du prüfst die Fakten, bearbeitest die Inhalte und entscheidest,
              was du veröffentlichst.
            </p>
          </div>
          <small>
            Lokale Pilotversion · keine automatische Veröffentlichung
          </small>
        </section>
        <section className="auth-card-form">
          <div className="auth-glyph" aria-hidden="true">
            <BrandMark />
          </div>
          <h1>
            {view === "signup"
              ? "Konto erstellen"
              : view === "forgot"
                ? "Passwort vergessen?"
                : view === "reset"
                  ? "Neues Passwort"
                  : "Willkommen zurück"}
          </h1>
          <p className="auth-description">
            Lokaler Testzugang. Öffentlicher Pilot noch nicht freigegeben.
          </p>
          <form className="auth-form" onSubmit={submit} key={view}>
            {view === "signup" && (
              <label className="auth-field">
                Dein Name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            {view !== "reset" && (
              <label className="auth-field">
                E-Mail-Adresse
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
            )}
            {view !== "forgot" && (
              <label className="auth-field">
                Passwort
                <input
                  name="password"
                  type="password"
                  required
                  minLength={view === "signin" ? 1 : 12}
                  maxLength={128}
                  autoComplete={
                    view === "signin" ? "current-password" : "new-password"
                  }
                />
              </label>
            )}
            {view === "signup" && (
              <p className="quiet">
                Mindestens 12 Zeichen. Bitte im lokalen Test nur synthetische
                Daten verwenden.
              </p>
            )}
            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="auth-banner">
                {notice}
              </p>
            )}
            <button className="auth-primary" disabled={busy}>
              {busy
                ? "Bitte warten …"
                : view === "signup"
                  ? "Konto erstellen"
                  : view === "forgot"
                    ? "Link anfordern"
                    : view === "reset"
                      ? "Passwort speichern"
                      : "Anmelden"}
            </button>
          </form>
          <div className="auth-foot">
            {view !== "signin" && (
              <button onClick={() => go("signin")}>Zur Anmeldung</button>
            )}
            {view === "signin" && (
              <>
                <button onClick={() => go("signup")}>
                  Neues Konto erstellen
                </button>{" "}
                ·{" "}
                <button onClick={() => go("forgot")}>
                  Passwort vergessen?
                </button>
              </>
            )}
          </div>
          <p className="quiet">
            Lokaler E-Mail-Sink aktiv. Rechtliche Freigabe und externe
            Zustellung stehen aus.
          </p>
        </section>
      </div>
    </main>
  );
}
