type EndpointMeasurement = Readonly<{
  path: string;
  status: number;
  responseBytes: number;
  cacheControl: string | null;
  contentVersion: string | null;
  serverContentDurationMs: number | null;
  coldMs: number;
  warmMs: readonly number[];
}>;

type ImageMeasurement = Readonly<{
  citySlug: string;
  use: "hero" | "card";
  url: string;
  status: number;
  contentType: string | null;
  bytes: number;
  durationMs: number;
}>;

const options = parseOptions(process.argv.slice(2));
const endpoints: EndpointMeasurement[] = [];
const images: ImageMeasurement[] = [];

endpoints.push(await measureEndpoint(`/api/content/cities?locale=${options.locale}`));
for (const citySlug of options.cities) {
  endpoints.push(await measureEndpoint(
    `/api/content/cities/${encodeURIComponent(citySlug)}?locale=${options.locale}`,
  ));
  const summaryPath =
    `/api/content/cities/${encodeURIComponent(citySlug)}/summary?locale=${options.locale}`;
  endpoints.push(await measureEndpoint(summaryPath));
  const summaryResponse = await fetch(new URL(summaryPath, options.origin));
  if (!summaryResponse.ok) continue;
  const summary = asObject(await summaryResponse.json());
  const city = asObject(summary.city);
  const places = Array.isArray(summary.places) ? summary.places : [];
  const imageTargets = [
    ...readImageTargets(city.media, "hero"),
    ...places.flatMap((place) => readImageTargets(asObject(place).media, "card")),
  ];
  const uniqueTargets = [...new Map(imageTargets.map((target) => [target.url, target])).values()];
  for (const target of uniqueTargets) {
    images.push(await measureImage(citySlug, target.use, target.url));
  }
}

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  origin: options.origin.origin,
  locale: options.locale,
  warmSamples: options.warmSamples,
  endpoints,
  images,
}, null, 2));

async function measureEndpoint(path: string): Promise<EndpointMeasurement> {
  const cold = await timedFetch(path, true);
  const warm = [];
  for (let index = 0; index < options.warmSamples; index += 1) {
    warm.push(await timedFetch(path, false));
  }
  return {
    path,
    status: cold.response.status,
    responseBytes: cold.bytes,
    cacheControl: cold.response.headers.get("cache-control"),
    contentVersion: cold.response.headers.get("x-citywalk-content-version"),
    serverContentDurationMs: readServerDuration(cold.response.headers.get("server-timing")),
    coldMs: cold.durationMs,
    warmMs: warm.map(({ durationMs }) => durationMs),
  };
}

async function timedFetch(path: string, bypassCache: boolean) {
  const startedAt = performance.now();
  const response = await fetch(new URL(path, options.origin), {
    headers: bypassCache ? { "Cache-Control": "no-cache" } : undefined,
  });
  const bytes = (await response.arrayBuffer()).byteLength;
  return { response, bytes, durationMs: round(performance.now() - startedAt) };
}

async function measureImage(
  citySlug: string,
  use: "hero" | "card",
  path: string,
): Promise<ImageMeasurement> {
  const startedAt = performance.now();
  const response = await fetch(new URL(path, options.origin));
  const bytes = (await response.arrayBuffer()).byteLength;
  return {
    citySlug,
    use,
    url: new URL(path, options.origin).pathname + new URL(path, options.origin).search,
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes,
    durationMs: round(performance.now() - startedAt),
  };
}

function readImageTargets(
  value: unknown,
  use: "hero" | "card",
): readonly Readonly<{ use: "hero" | "card"; url: string }>[] {
  if (!Array.isArray(value)) return [];
  const image = value.find((entry) => {
    const media = asObject(entry);
    return media.kind === "image" && [use, "hero", "gallery", "thumbnail"].includes(String(media.purpose));
  });
  const media = asObject(image);
  const variants = asObject(media.variants);
  const url = typeof variants[use] === "string"
    ? variants[use]
    : typeof media.url === "string" ? media.url : undefined;
  return url ? [{ use, url }] : [];
}

function readServerDuration(value: string | null): number | null {
  const match = value?.match(/citywalk-content;dur=([0-9.]+)/);
  return match ? Number(match[1]) : null;
}

function parseOptions(args: readonly string[]) {
  const values = Object.fromEntries(args.flatMap((arg) => {
    const match = /^--([^=]+)=(.+)$/.exec(arg);
    return match ? [[match[1], match[2]]] : [];
  }));
  const rawOrigin = values.origin ?? "http://localhost:3000";
  const origin = new URL(rawOrigin);
  if (!/^https?:$/.test(origin.protocol)) throw new Error("Performance origin must use HTTP(S).");
  const cities = (values.cities ?? "hamburg,lubeck")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const warmSamples = Number(values.warm ?? 5);
  if (!Number.isInteger(warmSamples) || warmSamples < 1 || warmSamples > 20) {
    throw new Error("--warm must be an integer from 1 to 20.");
  }
  return { origin, cities, warmSamples, locale: values.locale ?? "en" };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export {};
