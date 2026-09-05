"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function signOut() {
    setIsLoading(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary transition hover:bg-surface hover:text-text-primary disabled:opacity-60"
      disabled={isLoading}
      onClick={signOut}
      type="button"
    >
      <LogOut aria-hidden="true" size={18} />
      {isLoading ? "Signing out…" : "Sign out"}
    </button>
  );
}
