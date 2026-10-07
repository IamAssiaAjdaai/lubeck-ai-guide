import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNativeAnalyticsConsent } from "./analyticsConsent";

const STORAGE_KEY = "citywalk:marketing-attribution:v1";

export type NativeMarketingAttribution = Readonly<{
  source?: string;
  medium?: string;
  campaign?: string;
  contentId?: string;
  landingVariant?: string;
  citySlug?: string;
}>;

export function readNativeMarketingAttribution(input: Readonly<Record<string, string | string[] | undefined>>): NativeMarketingAttribution {
  return compact({
    source: clean(read(input.utm_source)),
    medium: clean(read(input.utm_medium)),
    campaign: clean(read(input.utm_campaign)),
    contentId: clean(read(input.utm_content)),
    landingVariant: clean(read(input.marketingSlug)),
    citySlug: clean(read(input.citySlug)),
  });
}

export async function persistNativeMarketingAttribution(value: NativeMarketingAttribution): Promise<void> {
  if (await getNativeAnalyticsConsent() !== "granted") {
    await clearNativeMarketingAttribution();
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export async function clearNativeMarketingAttribution(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function loadNativeMarketingAttribution(): Promise<NativeMarketingAttribution | undefined> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return undefined;
  try {
    return compact(JSON.parse(stored) as NativeMarketingAttribution);
  } catch {
    return undefined;
  }
}

function read(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function compact(value: NativeMarketingAttribution): NativeMarketingAttribution {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => Boolean(item)),
  ) as NativeMarketingAttribution;
}
