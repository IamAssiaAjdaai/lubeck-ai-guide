import { usePublicPurchases } from "../hooks/usePublicPurchases";
import { t, type TranslationKey } from "@citywalk/i18n";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import { readPremiumAccess } from "../lib/premiumAccess";
import {
  premiumEnabled,
  type PremiumPlan,
  type PremiumPlanKind,
} from "../lib/revenueCatPremiumCore";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeIcon } from "./NativeIcon";
import {
  AppText,
  PressableSurface,
  PrimaryButton,
  StatusMessage,
} from "./ui";

async function premiumBilling() {
  return (await import("../lib/revenueCatPremium")).revenueCatPremiumBilling;
}

type State =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "active" }>
  | Readonly<{ status: "ready"; plans: readonly PremiumPlan[]; message?: TranslationKey }>;

function preferredPlan(plans: readonly PremiumPlan[]): PremiumPlan | undefined {
  return plans.find((plan) => plan.kind === "annual") ?? plans[0];
}

function savingsPercent(
  plans: readonly PremiumPlan[],
  plan: PremiumPlan,
): number | undefined {
  if (plan.kind !== "annual" || typeof plan.price !== "number") return;
  const monthly = plans.find(
    (candidate) => candidate.kind === "monthly" && typeof candidate.price === "number",
  );
  if (!monthly?.price || monthly.price <= 0) return;
  const percent = Math.round((1 - plan.price / (monthly.price * 12)) * 100);
  return percent > 0 ? percent : undefined;
}

export function RevenueCatPremiumCard({ account }: { account: string }) {
  const purchasesAllowed = usePublicPurchases();
  const enabled = purchasesAllowed && premiumEnabled();
  const { locale } = useNativeLocale();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<PremiumPlanKind | "restore">();
  const [selected, setSelected] = useState<PremiumPlanKind>();

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void Promise.all([
      readPremiumAccess(account),
      premiumBilling().then((billing) => billing.plans()),
    ])
      .then(([premium, plans]) => {
        if (!active) return;
        if (premium) {
          setState({ status: "active" });
          return;
        }
        if (plans.length) {
          setState({ status: "ready", plans });
          setSelected(preferredPlan(plans)?.kind);
          return;
        }
        setState({ status: "unavailable" });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      });
    return () => {
      active = false;
    };
  }, [account, enabled]);

  const selectedPlan = useMemo(
    () =>
      state.status === "ready"
        ? state.plans.find((plan) => plan.kind === selected) ?? preferredPlan(state.plans)
        : undefined,
    [selected, state],
  );

  if (!enabled) return null;

  async function purchase() {
    if (busy || state.status !== "ready" || !selectedPlan) return;
    setBusy(selectedPlan.kind);
    try {
      const result = await (await premiumBilling()).purchase(selectedPlan.kind, account);
      if (result.status === "active") setState({ status: "active" });
      else if (result.status === "cancelled") {
        setState({ ...state, message: "premium.purchaseCancelled" });
      } else {
        setState({ ...state, message: "premium.purchaseReceivedPending" });
      }
    } catch {
      setState({ ...state, message: "premium.purchaseUnavailable" });
    } finally {
      setBusy(undefined);
    }
  }

  async function restore() {
    if (busy || state.status !== "ready") return;
    setBusy("restore");
    try {
      const result = await (await premiumBilling()).restore(account);
      if (result.status === "active") setState({ status: "active" });
      else setState({ ...state, message: "premium.noVerifiedSubscription" });
    } catch {
      setState({ ...state, message: "premium.restoreUnavailable" });
    } finally {
      setBusy(undefined);
    }
  }

  if (state.status === "loading") {
    return (
      <AppText variant="metadata" style={styles.secondary}>
        {t(locale, "premium.loadingOptions")}
      </AppText>
    );
  }

  if (state.status === "active") {
    return (
      <View style={styles.active} testID="premium-active-state">
        <NativeIcon ios="checkmark.circle.fill" android="check_circle" color={colors.success} />
        <View style={styles.flex}>
          <AppText variant="label">{t(locale, "premium.active")}</AppText>
          <AppText variant="metadata" style={styles.secondary}>
            {t(locale, "premium.verified")}
          </AppText>
        </View>
      </View>
    );
  }

  if (state.status === "unavailable") {
    return <StatusMessage>{t(locale, "premium.optionsUnavailable")}</StatusMessage>;
  }

  return (
    <View style={styles.section} testID="premium-plan-selector">
      <AppText variant="metadata" style={styles.secondary}>
        {t(locale, "premium.crossCityDescription")}
      </AppText>

      <View accessibilityRole="radiogroup" style={styles.plans}>
        {state.plans.map((plan) => {
          const checked = selectedPlan?.kind === plan.kind;
          const percent = savingsPercent(state.plans, plan);
          const planLabel = t(
            locale,
            plan.kind === "monthly" ? "premium.monthly" : "premium.yearly",
          );
          const priceLabel = t(
            locale,
            plan.kind === "monthly" ? "premium.priceMonthly" : "premium.priceYearly",
            { price: plan.localizedPrice },
          );
          return (
            <PressableSurface
              key={plan.kind}
              accessibilityRole="radio"
              accessibilityLabel={planLabel + " · " + plan.localizedPrice}
              accessibilityState={{ checked }}
              style={[styles.plan, checked && styles.planSelected]}
              onPress={() => setSelected(plan.kind)}
            >
              <View style={styles.flex}>
                <View style={styles.planTitleRow}>
                  <AppText variant="label">{planLabel}</AppText>
                  {plan.kind === "annual" ? (
                    <AppText variant="caption" style={styles.valueBadge}>
                      {percent === undefined
                        ? t(locale, "premium.bestValue")
                        : t(locale, "premium.savePercent", { percent })}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="metadata" style={styles.secondary}>
                  {priceLabel}
                </AppText>
              </View>
              <NativeIcon
                ios={checked ? "checkmark.circle.fill" : "circle"}
                android={checked ? "radio_button_checked" : "radio_button_unchecked"}
                color={checked ? colors.primary : colors.borderStrong}
                size={21}
              />
            </PressableSurface>
          );
        })}
      </View>

      <PrimaryButton
        wrapLabel
        label={
          selectedPlan
            ? t(locale, "premium.unlockWithPrice", { price: selectedPlan.localizedPrice })
            : t(locale, "premium.unlock")
        }
        busy={Boolean(selectedPlan && busy === selectedPlan.kind)}
        disabled={Boolean(busy) || !selectedPlan}
        onPress={() => void purchase()}
      />

      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={t(locale, "premium.restorePurchases")}
        disabled={Boolean(busy)}
        style={styles.restore}
        onPress={() => void restore()}
      >
        <AppText variant="label" style={styles.restoreText}>
          {busy === "restore"
            ? t(locale, "premium.restoringPurchases")
            : t(locale, "premium.restorePurchases")}
        </AppText>
      </PressableSurface>

      {state.message ? <StatusMessage>{t(locale, state.message)}</StatusMessage> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  secondary: { color: colors.textMuted },
  flex: { flex: 1, minWidth: 0 },
  plans: { gap: spacing.sm },
  plan: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  planSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  valueBadge: {
    color: colors.primary,
    fontWeight: "700",
  },
  restore: {
    minHeight: 40,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  restoreText: { color: colors.primary },
  active: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
});
