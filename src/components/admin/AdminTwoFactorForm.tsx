"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { adminAuthClient } from "@/lib/admin/authClient";

type Mode = "totp" | "backup";

export function AdminTwoFactorForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = mode === "totp"
        ? await adminAuthClient.twoFactor.verifyTotp({
            code: code.trim(),
            trustDevice,
          })
        : await adminAuthClient.twoFactor.verifyBackupCode({
            code: code.trim(),
            disableSession: false,
            trustDevice,
          });

      if (result.error) {
        const status = typeof result.error.status === "number" ? result.error.status : undefined;
        const errorCode = typeof result.error.code === "string" ? result.error.code : "";
        if (status === 429 || errorCode === "ACCOUNT_TEMPORARILY_LOCKED") {
          setError("Too many failed attempts. This staff account is temporarily locked.");
        } else {
          setError(mode === "totp" ? "That authenticator code was not accepted." : "That backup code was not accepted.");
        }
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Verification is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          aria-pressed={mode === "totp"}
          className={"min-h-11 rounded-lg px-3 text-sm font-semibold " + (mode === "totp" ? "bg-white shadow-sm" : "text-text-secondary")}
          disabled={busy}
          onClick={() => { setMode("totp"); setCode(""); setError(null); }}
          type="button"
        >
          Authenticator
        </button>
        <button
          aria-pressed={mode === "backup"}
          className={"min-h-11 rounded-lg px-3 text-sm font-semibold " + (mode === "backup" ? "bg-white shadow-sm" : "text-text-secondary")}
          disabled={busy}
          onClick={() => { setMode("backup"); setCode(""); setError(null); }}
          type="button"
        >
          Backup code
        </button>
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        <span>{mode === "totp" ? "6-digit authenticator code" : "One-time backup code"}</span>
        <input
          autoComplete={mode === "totp" ? "one-time-code" : "off"}
          className="min-h-12 rounded-xl border border-border bg-white px-4 font-mono text-base outline-none transition focus:border-primary focus:ring-3 focus:ring-blue-100"
          inputMode={mode === "totp" ? "numeric" : "text"}
          maxLength={mode === "totp" ? 6 : 128}
          onChange={(event) => setCode(mode === "totp" ? event.target.value.replace(/\D/g, "") : event.target.value)}
          placeholder={mode === "totp" ? "123456" : "XXXX-XXXX"}
          required
          value={code}
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
        <input
          checked={trustDevice}
          className="mt-1 size-4"
          disabled={busy}
          onChange={(event) => setTrustDevice(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong className="block">Trust this device for 30 days</strong>
          <span className="mt-1 block text-xs leading-5 text-text-secondary">
            Optional. Leave this off on shared or temporary computers.
          </span>
        </span>
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
      ) : null}

      <button
        className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy || !code.trim() || (mode === "totp" && code.length !== 6)}
        type="submit"
      >
        <ShieldCheck aria-hidden="true" size={19} />
        {busy ? "Verifying…" : "Verify & continue"}
      </button>

      <Link className="block text-center text-sm font-bold text-primary underline-offset-4 hover:underline" href="/admin/login">
        Back to staff sign in
      </Link>
    </form>
  );
}