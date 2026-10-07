"use client";

import { useEffect, useMemo, useState } from "react";

type Suggestion = Readonly<{
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
}>;

export function PlaceLocationLookup({
  cityName,
  countryCode,
}: Readonly<{
  cityName: string;
  countryCode: string;
}>) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<readonly Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmedQuery = query.trim();

  const searchUrl = useMemo(() => {
    if (trimmedQuery.length < 3) return null;
    const params = new URLSearchParams({ q: trimmedQuery, city: cityName, country: countryCode });
    return `/api/admin/place-search?${params}`;
  }, [cityName, countryCode, trimmedQuery]);

  useEffect(() => {
    if (!searchUrl) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(searchUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Place search failed");
        const body = await response.json() as { suggestions?: Suggestion[] };
        setSuggestions(body.suggestions ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchUrl]);

  function choose(suggestion: Suggestion) {
    setQuery(suggestion.name);
    setSuggestions([]);

    setInputValue("latitude", String(suggestion.latitude));
    setInputValue("longitude", String(suggestion.longitude));

    const name = document.querySelector<HTMLInputElement>('input[name="name"]');
    if (name && !name.value.trim()) setInputValue("name", suggestion.name);

    const slug = document.querySelector<HTMLInputElement>('input[name="slug"]');
    if (slug && !slug.value.trim()) setInputValue("slug", slugify(suggestion.name));
  }

  return (
    <div className="sm:col-span-2">
      <label className="grid gap-2 text-sm font-semibold">
        Find place on map
        <input
          autoComplete="off"
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search in ${cityName}, e.g. Elbphilharmonie`}
          type="search"
          value={query}
        />
      </label>
      <p className="mt-2 text-xs text-text-secondary">
        Type a place name and choose the correct result. CITYWALK fills its name and map coordinates automatically.
      </p>
      {loading ? <p className="mt-2 text-xs text-text-secondary">Searching…</p> : null}
      {suggestions.length ? (
        <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                className="w-full border-b border-border px-3 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50"
                onClick={() => choose(suggestion)}
                type="button"
              >
                <span className="block font-semibold">{suggestion.name}</span>
                <span className="block text-xs text-text-secondary">{suggestion.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[11px] text-text-secondary">Search data © OpenStreetMap contributors, via Photon.</p>
    </div>
  );
}

function setInputValue(name: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
