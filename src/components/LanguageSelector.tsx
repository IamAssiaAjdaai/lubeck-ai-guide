"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Globe2, Search, X } from "lucide-react";
import posthog from "posthog-js";

import type { Locale } from "@/lib/i18n";

type LanguageOption = { locale: Locale; nativeName: string };
type LanguageSelectorProps = {
  currentLocale: Locale;
  label: string;
  closeLabel: string;
  options: readonly LanguageOption[];
  compact?: boolean;
};

export default function LanguageSelector({ currentLocale, label, closeLabel, options, compact = false }: LanguageSelectorProps) {
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
      {!compact && <span className="mb-3 block text-center text-sm font-semibold">{label}</span>}
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={isPending}
        onClick={() => setIsOpen(true)}
        className={`surface-card flex min-h-11 items-center gap-2.5 text-start font-medium transition hover:border-blue-200 disabled:opacity-60 ${compact ? "w-auto rounded-full px-3 text-sm" : "h-13 w-full px-4"}`}
      >
        <Globe2 aria-hidden="true" size={20} strokeWidth={1.8} className="text-text-secondary" />
        <span className={compact ? "max-w-24 truncate" : "flex-1"}>{currentLanguage.nativeName}</span>
        <ChevronDown aria-hidden="true" size={18} strokeWidth={1.8} className="text-text-secondary" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[2px] sm:items-center" onClick={() => setIsOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
            className="mx-auto w-full max-w-md rounded-t-[24px] bg-surface-elevated p-5 shadow-xl sm:rounded-[24px]"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{label}</h2>
              <button type="button" aria-label={closeLabel} onClick={() => setIsOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text-secondary"><X aria-hidden="true" size={20} strokeWidth={1.8} /></button>
            </div>
            <div className="relative mt-4">
              <span aria-hidden="true" className="absolute inset-y-0 start-4 flex items-center text-text-muted"><Search size={18} strokeWidth={1.8} /></span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={label}
                aria-label={label}
                className="h-12 w-full rounded-xl border border-border bg-surface-elevated pe-4 ps-10 outline-none focus:border-accent"
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
                    className="flex min-h-12 w-full items-center rounded-xl px-3 text-start transition hover:bg-surface"
                  >
                    <span className="flex-1">{language.nativeName}</span>
                    {selected && <Check aria-hidden="true" size={18} strokeWidth={2} className="text-accent" />}
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
