"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_MIN_PASSWORD_LENGTH, AUTH_MAX_PASSWORD_LENGTH } from "@citywalk/traveler-core";
import { getLocaleDirection, t, type SharedLocale, type TranslationKey } from "@citywalk/i18n";

type State = "checking" | "ready" | "invalid" | "unavailable" | "success";
export default function ResetPasswordForm({ locale }: { locale: SharedLocale }) {
  const token = useRef("");
  const initialized = useRef(false);
  const lock = useRef(false);
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState({ password: false, confirmation: false });
  const [error, setError] = useState<TranslationKey>();
  const label = (key: TranslationKey) => t(locale, key);
  const check = useCallback(async () => {
    if (!/^[a-zA-Z0-9]{24}$/.test(token.current)) { setState("invalid"); return; }
    setState("checking");
    try {
      const response = await fetch("/api/account/reset-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token.current }), cache: "no-store" });
      const result = await response.json().catch(() => null);
      setState(response.ok && result?.valid === true ? "ready" : response.status === 400 ? "invalid" : "unavailable");
    } catch { setState("unavailable"); }
  }, []);
  useEffect(() => {
    // Preserve in memory across StrictMode's effect replay, never browser storage.
    if (initialized.current) return;
    initialized.current = true;
    token.current = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    window.history.replaceState(null, "", `${window.location.pathname}?locale=${locale}`);
    void check();
  }, [check, locale]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return;
    const issue: TranslationKey | undefined = password.length < AUTH_MIN_PASSWORD_LENGTH ? "profile.passwordTooShort" : password.length > AUTH_MAX_PASSWORD_LENGTH ? "profile.passwordTooLong" : password !== confirmation ? "profile.passwordMismatch" : undefined;
    if (issue) { setError(issue); return; }
    lock.current = true; setBusy(true); setError(undefined);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token.current, newPassword: password }), cache: "no-store" });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.status === true) { token.current = ""; setPassword(""); setConfirmation(""); setState("success"); }
      else if (response.status === 400) { setState("invalid"); setPassword(""); setConfirmation(""); }
      else setError(response.status === 429 ? "lifecycle.rateLimited" : "lifecycle.unavailable");
    } catch { setError("lifecycle.unavailable"); }
    finally { lock.current = false; setBusy(false); }
  }
  const button = "min-h-12 rounded-xl border border-blue-200 px-4 py-3 text-start font-semibold whitespace-normal break-words disabled:opacity-50";
  return <main dir={getLocaleDirection(locale)} lang={locale} className="mx-auto flex w-full max-w-lg flex-col gap-5 px-5 py-10 text-blue-950">
    <h1 className="text-3xl font-bold">{label("profile.resetPassword")}</h1>
    {state !== "ready" ? <p role="status">{label(state === "checking" ? "lifecycle.validating" : state === "invalid" ? "lifecycle.invalidLink" : state === "success" ? "lifecycle.resetSuccess" : "lifecycle.unavailable")}</p> : null}
    {state === "unavailable" ? <button className={button} onClick={() => void check()}>{label("common.retry")}</button> : null}
    {state === "ready" ? <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {(["password", "confirmation"] as const).map((field) => <div key={field} className="flex flex-col gap-2">
        <label htmlFor={field}>{label(field === "password" ? "profile.newPassword" : "profile.confirmPassword")}</label>
        <input id={field} name={field} autoComplete="new-password" type={visible[field] ? "text" : "password"} value={field === "password" ? password : confirmation} onChange={event => field === "password" ? setPassword(event.target.value) : setConfirmation(event.target.value)} disabled={busy} className="min-h-12 min-w-0 rounded-lg border p-3 text-base" />
        <button type="button" className={button} aria-pressed={visible[field]} onClick={() => setVisible(value => ({ ...value, [field]: !value[field] }))}>{label(visible[field] ? "profile.hidePassword" : "profile.showPassword")}: {label(field === "password" ? "profile.newPassword" : "profile.confirmPassword")}</button>
      </div>)}
      <p>{label("profile.passwordTooShort")}</p>
      {error ? <p role="alert">{label(error)}</p> : null}
      <button type="submit" disabled={busy} aria-busy={busy} className={`${button} bg-blue-700 text-white`}>{label("lifecycle.resetSubmit")}</button>
    </form> : null}
    <a className={button} href={`/${locale}/account`}>{label("profile.signIn")}</a>
  </main>;
}
