import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { t } from "@citywalk/i18n";
import { getCityUnlockProduct } from "@citywalk/traveler-core";
import { nativeAuthClient } from "../lib/auth/client";
import { CityUnlockController, cityUnlockPreviewEnabled, type UnlockSnapshot } from "../lib/cityUnlock";
import { nativeBilling } from "../lib/nativeBillingRuntime";
import { nativeCityName } from "../lib/displayNames";
import { readCityUnlock } from "../lib/cityUnlockAccess";
import { useNativeLocale } from "../localization/LocaleProvider";
import { ImageOverlayHero } from "./ImageOverlayHero";
import { AppText, PrimaryButton, Screen, StatusMessage } from "./ui";

/** Opt-in sandbox only. Existing traveler behavior stays unchanged outside this gate. */
export function CityUnlockGate({ citySlug, cityName, children }: { citySlug: string; cityName: string; children(authorize: () => Promise<boolean>): ReactNode }) {
  return cityUnlockPreviewEnabled() && getCityUnlockProduct(citySlug)
    ? <PreviewCityUnlockGate key={citySlug} citySlug={citySlug} cityName={cityName}>{children}</PreviewCityUnlockGate>
    : children(async () => true);
}
function AuthorizedContent({ children, authorize }: { children(authorize: () => Promise<boolean>): ReactNode; authorize(): Promise<boolean> }) {
  return children(authorize);
}
export function PreviewCityUnlockGate({ citySlug, cityName, children }: { citySlug: string; cityName: string; children(authorize: () => Promise<boolean>): ReactNode }) {
  const { locale } = useNativeLocale();
  const city = nativeCityName(citySlug, cityName, locale);
  const copy = (key: Parameters<typeof t>[1], values: Record<string, string> = {}) => t(locale, key, { city, ...values });
  const { data: session, isPending } = nativeAuthClient.useSession();
  const account = session?.user.id;
  const [visible, setVisible] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ account?: string; snapshot: UnlockSnapshot }>({ account, snapshot: { state: "store_product_loading" } });
  const state: UnlockSnapshot = result.account === account ? result.snapshot : { state: "store_product_loading" };
  const pending = useRef<((allowed: boolean) => void) | undefined>(undefined);
  const controller = useMemo(() => new CityUnlockController(citySlug, {
    product: id => nativeBilling.product(id),
    purchase: (id, owner) => nativeBilling.purchase(id, owner),
    restore: (id, owner) => nativeBilling.restore(id, owner),
    verify: (proof, owner) => nativeBilling.verify(proof, owner),
    account: () => account,
    access: user => readCityUnlock(citySlug, user),
  }, snapshot => setResult({ account, snapshot })), [citySlug, account]);
  useEffect(() => () => { controller.dispose(); }, [controller]);
  useEffect(() => nativeBilling.subscribe(outcome => { if (visible) void controller.storeChanged(outcome); }), [controller, visible]);
  useEffect(() => () => { pending.current?.(false); pending.current = undefined; }, []);
  useEffect(() => { if (visible && !isPending) void controller.load(); }, [controller, visible, isPending]);
  useFocusEffect(useCallback(() => { setAuthenticating(false); }, []));
  function close(allowed = false) {
    controller.dispose(); setVisible(false); pending.current?.(allowed); pending.current = undefined;
  }
  async function authorize() {
    // Storage's Start transition still revalidates the current plan after this resolves.
    if (pending.current || isPending) return false;
    try { if (await readCityUnlock(citySlug, account)) return true; } catch { /* show recovery in sheet */ }
    setVisible(true);
    return new Promise<boolean>(resolve => { pending.current = resolve; });
  }
  async function continueWalk() {
    if (checking) return;
    setChecking(true);
    try { if (await readCityUnlock(citySlug, account)) close(true); else await controller.load(); }
    catch { setResult({ account, snapshot: { state: "access_unavailable" } }); }
    finally { setChecking(false); }
  }
  function authenticate(entry: "sign-in" | "sign-up") {
    setAuthenticating(true);
    router.push({ pathname: "/account", params: { entry, returnToWalk: "1" } });
  }
  const busy = ["store_product_loading", "purchase_started", "restore_started", "verification_pending", "entitlement_activating"].includes(state.state);
  const owned = ["unlocked", "already_owned", "restore_success"].includes(state.state);
  return <><AuthorizedContent authorize={authorize}>{children}</AuthorizedContent><Modal visible={visible && !authenticating} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => close()}>
    <Screen navigation={false} onBack={() => close()}>
      <ImageOverlayHero title={copy("unlock.title")} subtitle={copy("unlock.subtitle")} />
      <AppText>{copy("unlock.description")}</AppText>
      <View style={{ gap: 12 }}>
        {(["route", "adapt", "stories", "guide", "discoveries"] as const).map(key => <AppText key={key}>{copy(`unlock.benefits.${key}`)}</AppText>)}
      </View>
      <AppText>{copy("unlock.once")}</AppText>
      <AppText>{copy("unlock.availability")}</AppText>
      <StatusMessage><AppText accessibilityLiveRegion="polite">{copy(`unlock.states.${state.state}`)}</AppText></StatusMessage>
      {owned ? <PrimaryButton label={copy("unlock.continue")} busy={checking} onPress={() => void continueWalk()} /> : <>
        {!account ? <>
          <AppText>{copy("unlock.account")}</AppText>
          <PrimaryButton label={t(locale, "profile.signUp")} onPress={() => authenticate("sign-up")} />
          <PrimaryButton label={t(locale, "profile.signIn")} tone="secondary" onPress={() => authenticate("sign-in")} />
        </> : <PrimaryButton label={state.product ? copy("unlock.purchase", { price: state.product.localizedPrice }) : copy("unlock.title")}
          disabled={!state.product || busy || state.state === "purchase_pending"} busy={busy}
          onPress={() => void controller.run("purchase")} />}
        <PrimaryButton label={copy("unlock.restore")} tone="secondary" disabled={busy} onPress={() => void controller.run("restore")} />
        <PrimaryButton label={copy("unlock.retry")} tone="secondary" disabled={busy} onPress={() => void controller.load()} />
      </>}
      <PrimaryButton label={copy("unlock.notNow")} tone="secondary" onPress={() => close()} />
    </Screen>
  </Modal></>;
}
