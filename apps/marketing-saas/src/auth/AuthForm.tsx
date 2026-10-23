import { useState, type FormEvent } from "react";
import { api, ApiFailure } from "../api";
import { expiredAuthCode, validateAuthForm, type AuthView } from "./formValidation";
import type { AuthField } from "./validation";
import "./auth.css";
import BrandIdentity, { BrandMark } from "../brand/BrandIdentity";
import { brandIdentity } from "../brand/identity";
export default function AuthForm({
  onSignedIn,
  localRegistration = false,
}: {
  onSignedIn: () => Promise<void>;
  localRegistration?: boolean;
}) {
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const [view, setView] = useState<AuthView>(
    expiredAuthCode(params.get("error")) ? "expired" : token ? "reset" : "signin",
  );
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AuthField, string>>>({});
  const fieldError = (field: AuthField) => fieldErrors[field] ? <span className="auth-error" id={`auth-${field}-error`} role="alert">{fieldErrors[field]}</span> : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const errors = validateAuthForm(view, fields);
    setFieldErrors(errors);
    setError("");
    setNotice("");
    if (Object.keys(errors).length) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const email = String(fields.get("email") ?? "")
        .trim()
        .toLowerCase();
      const password = String(fields.get("password") ?? "");
      if (view === "signup") {
        if (!localRegistration) throw new Error("Die öffentliche Registrierung ist geschlossen.");
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
        setShowPassword(false);
        setFieldErrors({});
        setNotice("Dein Passwort wurde geändert. Bitte neu anmelden.");
      }
    } catch (e) {
      if (e instanceof ApiFailure && expiredAuthCode(e.code)) {
        history.replaceState(null, "", "/auth");
        form.reset(); setShowPassword(false); setView("expired");
      } else setError(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  function go(next: AuthView) {
    if (view === "expired" || view === "reset") history.replaceState(null, "", "/auth");
    setShowPassword(false);
    setFieldErrors({});
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
                  : view === "expired" ? "Dieser Link ist nicht mehr gültig." : "Willkommen zurück"}
          </h1>
          <p className="auth-description">
            {localRegistration ? "Nur lokale synthetische Testkonten. Öffentlicher Pilot geschlossen." : "Anmeldung für bestehende Testkonten. Öffentliche Registrierung und Pilot sind geschlossen."}
          </p>
          {view === "expired" ? <div className="auth-message-screen">
            <p role="status">Der Link ist abgelaufen, ungültig oder wurde bereits verwendet. Es wurde keine Anmeldung durchgeführt.</p>
            <p>Für dein Passwort kannst du einen neuen Link anfordern. Zur E-Mail-Bestätigung melde dich erneut an; für ein unbestätigtes Konto wird ein neuer Bestätigungslink im lokalen QA-Mailordner abgelegt.</p>
            <button type="button" className="auth-primary" onClick={() => go("forgot")}>Neuen Passwort-Link anfordern</button>
          </div> : <form className="auth-form" onSubmit={submit} key={view} noValidate onChange={event => {
            const name = event.target instanceof HTMLInputElement ? event.target.name as AuthField : undefined;
            if (name) setFieldErrors(old => ({ ...old, [name]: undefined }));
          }}>
            {view === "signup" && (
              <div className="auth-field">
                <label htmlFor="auth-name">Dein Name</label>
                <input
                  id="auth-name" name="name"
                  aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "auth-name-error" : undefined}
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
                {fieldError("name")}
              </div>
            )}
            {view !== "reset" && (
              <div className="auth-field">
                <label htmlFor="auth-email">E-Mail-Adresse</label>
                <input
                  id="auth-email" name="email"
                  aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
                {fieldError("email")}
              </div>
            )}
            {view !== "forgot" && (
              <div className="auth-field">
                <label htmlFor="auth-password">Passwort</label>
                <div className="auth-input-wrap">
                  <input id="auth-password" name="password" type={showPassword ? "text" : "password"} required
                    minLength={view === "signin" ? 1 : 12} maxLength={128}
                    aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
                    autoComplete={view === "signin" ? "current-password" : "new-password"}/>
                  <button type="button" className="password-toggle" aria-controls="auth-password" aria-pressed={showPassword}
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                    onClick={() => setShowPassword(value => !value)}>{showPassword ? "Verbergen" : "Anzeigen"}</button>
                </div>
                {fieldError("password")}
              </div>
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
          </form>}
          <div className="auth-foot">
            {view !== "signin" && (
              <button onClick={() => go("signin")}>Zur Anmeldung</button>
            )}
            {view === "signin" && (
              <>
                {localRegistration && <><button onClick={() => go("signup")}>Neues Konto erstellen</button>{" · "}</>}
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
