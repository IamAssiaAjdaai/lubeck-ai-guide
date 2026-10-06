import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import { readPremiumAccess } from "../lib/premiumAccess";
import {
  premiumEnabled,
  type PremiumPlan,
  type PremiumPlanKind,
} from "../lib/revenueCatPremiumCore";
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
  | Readonly<{ status: "ready"; plans: readonly PremiumPlan[]; message?: string }>;

function preferredPlan(plans: readonly PremiumPlan[]): PremiumPlan | undefined {
  return plans.find((plan) => plan.kind === "annual") ?? plans[0];
}

function savingsLabel(plans: readonly PremiumPlan[], plan: PremiumPlan): string | undefined {
  if (plan.kind !== "annual" || typeof plan.price !== "number") return;
  const monthly = plans.find(
    (candidate) => candidate.kind === "monthly" && typeof candidate.price === "number",
  );
  if (!monthly?.price || monthly.price <= 0) return;
  const percent = Math.round((1 - plan.price / (monthly.price * 12)) * 100);
  return percent > 0 ? `Save ${percent}%` : undefined;
}

export function RevenueCatPremiumCard({ account }: { account: string }) {
  const enabled = premiumEnabled();
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
        setState({ ...state, message: "Purchase cancelled." });
      } else {
        setState({
          ...state,
          message: "Purchase received. Premium is not active on the server yet.",
        });
      }
    } catch {
      setState({ ...state, message: "Premium purchase is temporarily unavailable." });
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
      else {
        setState({
          ...state,
          message: "No verified Premium subscription is active for this account yet.",
        });
      }
    } catch {
      setState({ ...state, message: "Restore is temporarily unavailable." });
    } finally {
      setBusy(undefined);
    }
  }

  if (state.status === "loading") {
    return <AppText variant="metadata" style={styles.secondary}>Loading subscription options…</AppText>;
  }

  if (state.status === "active") {
    return (
      <View style={styles.active} testID="premium-active-state">
        <NativeIcon ios="checkmark.circle.fill" android="check_circle" color={colors.success} />
        <View style={styles.flex}>
          <AppText variant="label">Premium active</AppText>
          <AppText variant="metadata" style={styles.secondary}>
            Premium access is verified by CITYWALK.
          </AppText>
        </View>
      </View>
    );
  }

  if (state.status === "unavailable") {
    return <StatusMessage>Premium subscription options are currently unavailable.</StatusMessage>;
  }

  return (
    <View style={styles.section} testID="premium-plan-selector">
      <AppText variant="metadata" style={styles.secondary}>
        Premium across available CITYWALK cities · up to 20 verified AI Guide answers per day.
      </AppText>

      <View accessibilityRole="radiogroup" style={styles.plans}>
        {state.plans.map((plan) => {
          const checked = selectedPlan?.kind === plan.kind;
          const savings = savingsLabel(state.plans, plan);
          return (
            <PressableSurface
              key={plan.kind}
              accessibilityRole="radio"
              accessibilityLabel={`${plan.kind === "monthly" ? "Monthly" : "Yearly"} · ${plan.localizedPrice}`}
              accessibilityState={{ checked }}
              style={[styles.plan, checked && styles.planSelected]}
              onPress={() => setSelected(plan.kind)}
            >
              <View style={styles.flex}>
                <View style={styles.planTitleRow}>
                  <AppText variant="label">
                    {plan.kind === "monthly" ? "Monthly" : "Yearly"}
                  </AppText>
                  {plan.kind === "annual" ? (
                    <AppText variant="caption" style={styles.valueBadge}>
                      {savings ?? "Best value"}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="metadata" style={styles.secondary}>
                  {plan.localizedPrice}{plan.kind === "monthly" ? " / month" : " / year"}
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
        label={`Unlock CITYWALK Premium${selectedPlan ? ` · ${selectedPlan.localizedPrice}` : ""}`}
        busy={Boolean(selectedPlan && busy === selectedPlan.kind)}
        disabled={Boolean(busy) || !selectedPlan}
        onPress={() => void purchase()}
      />

      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel="Restore purchases"
        disabled={Boolean(busy)}
        style={styles.restore}
        onPress={() => void restore()}
      >
        <AppText variant="label" style={styles.restoreText}>
          {busy === "restore" ? "Restoring purchases…" : "Restore purchases"}
        </AppText>
      </PressableSurface>

      {state.message ? <StatusMessage>{state.message}</StatusMessage> : null}
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
