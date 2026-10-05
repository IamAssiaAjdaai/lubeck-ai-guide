"use client";

import type { Passkey } from "@better-auth/passkey";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { adminAuthClient } from "@/lib/admin/authClient";

type TotpEnrollment = Readonly<{
  totpURI: string;
  backupCodes: readonly string[];
}>;

export function AdminSecurityManager({
  initialTwoFactorEnabled,
}: Readonly<{
  initialTwoFactorEnabled: boolean;
}>) {
  const [passkeys, setPasskeys] = useState<readonly Passkey[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [passkeyName, setPasskeyName] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollment | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpPassword, setTotpPassword] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totpSecret = useMemo(() => {
    if (!totpEnrollment) return "";
    try {
      return new URL(totpEnrollment.totpURI).searchParams.get("secret") ?? "";
    } catch {
      return "";
    }
  }, [totpEnrollment]);

  async function refreshPasskeys() {
    setLoadingPasskeys(true);
    try {
      const result = await adminAuthClient.passkey.listUserPasskeys();
      if (result.error) {
        setError("Passkeys could not be loaded.");
        return;
      }
      setPasskeys(result.data ?? []);
    } catch {
      setError("Passkeys could not be loaded.");
    } finally {
      setLoadingPasskeys(false);
    }
  }

  useEffect(() => { void refreshPasskeys(); }, []);

  async function addPasskey() {
    setPasskeyBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await adminAuthClient.passkey.addPasskey({
        ...(passkeyName.trim() ? { name: passkeyName.trim() } : {}),
      });
      if (result.error) {
        setError("Passkey setup was cancelled or could not be completed.");
        return;
      }
      setPasskeyName("");
      setNotice("Passkey added. You can now use it from the CITYWALK staff sign-in.");
      await refreshPasskeys();
    } catch {
      setError("Passkey setup was cancelled or could not be completed.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function deletePasskey(id: string) {
    setPasskeyBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await adminAuthClient.passkey.deletePasskey({ id });
      if (result.error) {
        setError("The passkey could not be removed.");
        return;
      }
      setNotice("Passkey removed.");
      await refreshPasskeys();
    } catch {
      setError("The passkey could not be removed.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function beginTotpEnrollment() {
    setTwoFactorBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await adminAuthClient.twoFactor.enable({
        password: totpPassword,
        method: "totp",
        issuer: "CITYWALK Control Center",
      });
      if (
        result.error ||
        !result.data ||
        result.data.method !== "totp" ||
        !result.data.totpURI ||
        !result.data.backupCodes
      ) {
        setError("Authenticator setup could not be started. Check your password and try again.");
        return;
      }
      setTotpEnrollment({
        totpURI: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
      setTotpPassword("");
      setNotice("Add CITYWALK to your authenticator, then verify one code below.");
    } catch {
      setError("Authenticator setup could not be started.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function verifyTotpEnrollment() {
    setTwoFactorBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await adminAuthClient.twoFactor.verifyTotp({
        code: totpCode.trim(),
        trustDevice: false,
      });
      if (result.error) {
        setError("That authenticator code was not accepted.");
        return;
      }
      setTwoFactorEnabled(true);
      setTotpCode("");
      setNotice("Authenticator fallback enabled. Save the backup codes offline.");
    } catch {
      setError("That authenticator code was not accepted.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function disableTotp() {
    setTwoFactorBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await adminAuthClient.twoFactor.disable({ password: disablePassword });
      if (result.error) {
        setError("Authenticator fallback could not be disabled. Check your password.");
        return;
      }
      setTwoFactorEnabled(false);
      setTotpEnrollment(null);
      setDisablePassword("");
      setNotice("Authenticator fallback disabled.");
    } catch {
      setError("Authenticator fallback could not be disabled.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function copyBackupCodes() {
    if (!totpEnrollment?.backupCodes.length) return;
    try {
      await navigator.clipboard.writeText(totpEnrollment.backupCodes.join("\n"));
      setNotice("Backup codes copied. Store them somewhere private and offline.");
    } catch {
      setError("Could not copy backup codes. Copy them manually.");
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
      ) : null}

      <section className="surface-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary">
            <KeyRound aria-hidden="true" size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">Passkeys</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Primary staff sign-in. Passkeys use WebAuthn and stay bound to the CITYWALK admin origin.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border p-4">
          <label className="grid gap-2 text-sm font-semibold">
            <span>Passkey name</span>
            <input
              className="min-h-11 rounded-xl border border-border bg-white px-3"
              disabled={passkeyBusy}
              maxLength={80}
              onChange={(event) => setPasskeyName(event.target.value)}
              placeholder="Mac mini, iPhone, security key…"
              value={passkeyName}
            />
          </label>
          <button
            className="button-primary mt-3 min-h-11 px-4"
            disabled={passkeyBusy}
            onClick={() => void addPasskey()}
            type="button"
          >
            <KeyRound aria-hidden="true" size={18} />
            {passkeyBusy ? "Working…" : passkeys.length ? "Add another passkey" : "Add first passkey"}
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold">Registered passkeys</h3>
            <span className="text-xs text-text-secondary">
              {loadingPasskeys ? "Loading…" : <>{passkeys.length} registered</>}
            </span>
          </div>
          {!loadingPasskeys && passkeys.length === 0 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No passkey yet. Sign-in still works with the password fallback.
            </p>
          ) : null}
          {passkeys.length > 0 ? (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {passkeys.map((passkey, index) => (
                <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={passkey.id}>
                  <div>
                    <strong className="text-sm">{passkey.name || "Passkey " + (index + 1)}</strong>
                    <p className="mt-1 text-xs text-text-secondary">
                      Added {new Date(passkey.createdAt).toLocaleDateString()}
                      {passkey.backedUp ? " · synced/backed up" : ""}
                    </p>
                  </div>
                  <button
                    aria-label={"Remove " + (passkey.name || "passkey " + (index + 1))}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50"
                    disabled={passkeyBusy}
                    onClick={() => void deletePasskey(passkey.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} /> Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-text-secondary">
            Recommended: register at least two recovery paths, for example your Mac and iPhone or a separate security key.
          </p>
        </div>
      </section>

      <section className="surface-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck aria-hidden="true" size={21} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">Password fallback protection</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              TOTP protects password sign-in with an authenticator app. Passkey sign-in remains passwordless and does not require a second code.
            </p>
          </div>
        </div>

        {twoFactorEnabled ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="font-bold text-emerald-900">Authenticator fallback enabled</p>
            <p className="mt-1 text-sm text-emerald-900">
              Password sign-in now requires a TOTP code or one of your backup codes.
            </p>
            {totpEnrollment?.backupCodes.length ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold text-amber-900">Save these backup codes now</p>
                <p className="mt-1 text-sm text-amber-900">
                  Each code works once. Store them somewhere private and offline.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                  {totpEnrollment.backupCodes.map((code) => (
                    <code className="rounded-lg bg-white px-3 py-2" key={code}>{code}</code>
                  ))}
                </div>
                <button
                  className="button-secondary mt-3 min-h-10 px-3"
                  onClick={() => void copyBackupCodes()}
                  type="button"
                >
                  Copy backup codes
                </button>
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                aria-label="Current password to disable authenticator"
                className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3"
                onChange={(event) => setDisablePassword(event.target.value)}
                placeholder="Current password"
                type="password"
                value={disablePassword}
              />
              <button
                className="button-secondary min-h-11 px-4"
                disabled={twoFactorBusy || !disablePassword}
                onClick={() => void disableTotp()}
                type="button"
              >
                Disable authenticator
              </button>
            </div>
          </div>
        ) : totpEnrollment ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-border p-4">
              <p className="font-bold">1. Add CITYWALK to your authenticator</p>
              <p className="mt-2 text-sm text-text-secondary">
                Open the setup link on a compatible device or enter the secret manually.
              </p>
              <a className="button-secondary mt-3 inline-flex min-h-11 px-4" href={totpEnrollment.totpURI}>
                Open authenticator app
              </a>
              {totpSecret ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-text-secondary">Manual secret</p>
                  <code className="mt-1 block break-all text-sm">{totpSecret}</code>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="font-bold">2. Verify a 6-digit code</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  aria-label="Authenticator code"
                  autoComplete="one-time-code"
                  className="min-h-11 rounded-xl border border-border bg-white px-3 font-mono tracking-[0.2em]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  value={totpCode}
                />
                <button
                  className="button-primary min-h-11 px-4"
                  disabled={twoFactorBusy || totpCode.length !== 6}
                  onClick={() => void verifyTotpEnrollment()}
                  type="button"
                >
                  Verify & enable
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-900">Backup codes</p>
              <p className="mt-1 text-sm text-amber-900">
                Keep these outside CITYWALK and never share them. They become usable once TOTP verification succeeds.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                {totpEnrollment.backupCodes.map((code) => (
                  <code className="rounded-lg bg-white px-3 py-2" key={code}>{code}</code>
                ))}
              </div>
              <button className="button-secondary mt-3 min-h-10 px-3" onClick={() => void copyBackupCodes()} type="button">
                Copy backup codes
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-border p-4">
            <p className="font-bold">Set up an authenticator</p>
            <p className="mt-1 text-sm text-text-secondary">
              Confirm your current staff password. CITYWALK will create a TOTP secret and one-time backup codes.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                aria-label="Current password for authenticator setup"
                className="min-h-11 rounded-xl border border-border bg-white px-3"
                onChange={(event) => setTotpPassword(event.target.value)}
                placeholder="Current password"
                type="password"
                value={totpPassword}
              />
              <button
                className="button-secondary min-h-11 px-4"
                disabled={twoFactorBusy || !totpPassword}
                onClick={() => void beginTotpEnrollment()}
                type="button"
              >
                Set up authenticator
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}