"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import type { Locale } from "@/lib/i18n";

type LanguageOption = { locale: Locale; nativeName: string };
type LanguageSelectorProps = {
  currentLocale: Locale;
  label: string;
  closeLabel: string;
  options: readonly LanguageOption[];
};

function GlobeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21M12 3C9.8 5.4 8.7 8.4 8.7 12s1.1 6.6 3.3 9" />
    </svg>
  );
}

export default function LanguageSelector({ currentLocale, label, closeLabel, options }: LanguageSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const currentLanguage = options.find((item) => item.locale === currentLocale)!;
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? options.filter((item) => item.nativeName.toLocaleLowerCase().includes(normalized))
      : options;
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const selectLanguage = async (locale: Locale) => {
    if (locale === currentLocale) {
      setIsOpen(false);
      return;
    }

    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });

    if (!response.ok) return;

    posthog.capture("language_selected", {
      city: "lubeck",
      locale,
      previous_locale: currentLocale,
    });

    setIsOpen(false);
    setQuery("");
    startTransition(() => router.refresh());
  };

  return (
    <div>
      <span className="mb-4 block text-center text-sm font-semibold">{label}</span>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={isPending}
        onClick={() => setIsOpen(true)}
        className="flex h-14 w-full items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 text-start font-medium transition hover:border-zinc-500 disabled:opacity-60"
      >
        <GlobeIcon />
        <span className="flex-1">{currentLanguage.nativeName}</span>
        <span aria-hidden="true" className="text-zinc-500">⌄</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center" onClick={() => setIsOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
            className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{label}</h2>
              <button type="button" aria-label={closeLabel} onClick={() => setIsOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xl">×</button>
            </div>
            <div className="relative mt-4">
              <span aria-hidden="true" className="absolute inset-y-0 start-4 flex items-center text-zinc-400">⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={label}
                aria-label={label}
                className="h-12 w-full rounded-xl border border-zinc-300 pe-4 ps-10 outline-none focus:border-black"
              />
            </div>
            <div className="mt-3 max-h-[55vh] overflow-y-auto" role="listbox" aria-label={label}>
              {filteredOptions.map((language) => {
                const selected = language.locale === currentLocale;
                return (
                  <button
                    key={language.locale}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => void selectLanguage(language.locale)}
                    className="flex min-h-12 w-full items-center rounded-xl px-3 text-start transition hover:bg-zinc-100"
                  >
                    <span className="flex-1">{language.nativeName}</span>
                    {selected && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
