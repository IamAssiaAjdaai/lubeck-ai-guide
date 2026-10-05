import { useEffect, useState } from "react";
import { View } from "react-native";

import { readPremiumAccess } from "../lib/premiumAccess";
import {
  premiumEnabled,
  type PremiumPlan,
  type PremiumPlanKind,
} from "../lib/revenueCatPremiumCore";
import { AppText, Card, PrimaryButton, StatusMessage } from "./ui";

async function premiumBilling() {
  return (await import("../lib/revenueCatPremium")).revenueCatPremiumBilling;
}

type State =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "active" }>
  | Readonly<{ status: "ready"; plans: readonly PremiumPlan[]; message?: string }>;

export function RevenueCatPremiumCard({ account }: { account: string }) {
  const enabled = premiumEnabled();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState<PremiumPlanKind | "restore">();

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void Promise.all([readPremiumAccess(account), premiumBilling().then((billing) => billing.plans())])
      .then(([premium, plans]) => {
        if (!active) return;
        if (premium) setState({ status: "active" });
        else if (plans.length) setState({ status: "ready", plans });
        else setState({ status: "unavailable" });
      })
      .catch(() => { if (active) setState({ status: "unavailable" }); });
    return () => { active = false; };
  }, [account, enabled]);

  if (!enabled) return null;

  async function purchase(kind: PremiumPlanKind) {
    if (busy || state.status !== "ready") return;
    setBusy(kind);
    try {
      const result = await (await premiumBilling()).purchase(kind, account);
      if (result.status === "active") setState({ status: "active" });
      else if (result.status === "cancelled") setState({ ...state, message: "Purchase cancelled." });
      else setState({ ...state, message: "Purchase received. Premium is not active on the server yet." });
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
      else setState({ ...state, message: "No verified Premium subscription is active for this account yet." });
    } catch {
      setState({ ...state, message: "Restore is temporarily unavailable." });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <Card>
      <AppText variant="heading">CITYWALK Premium</AppText>
      {state.status === "loading" ? <AppText variant="metadata">Loading subscription options…</AppText> : null}
      {state.status === "active" ? <>
        <AppText variant="label">Premium active</AppText>
        <AppText variant="metadata">Premium access is verified by CITYWALK.</AppText>
      </> : null}
      {state.status === "unavailable" ? (
        <StatusMessage>Premium subscription options are currently unavailable.</StatusMessage>
      ) : null}
      {state.status === "ready" ? <>
        <AppText variant="metadata">Premium access across available CITYWALK cities · up to 20 verified AI Guide answers per day.</AppText>
        <View>
          {state.plans.map((plan) => (
            <PrimaryButton
              key={plan.kind}
              label={`${plan.kind === "monthly" ? "Monthly" : "Yearly"} · ${plan.localizedPrice}`}
              busy={busy === plan.kind}
              disabled={Boolean(busy)}
              onPress={() => void purchase(plan.kind)}
              tone={plan.kind === "monthly" ? undefined : "secondary"}
            />
          ))}
        </View>
        <PrimaryButton
          label="Restore purchases"
          tone="secondary"
          busy={busy === "restore"}
          disabled={Boolean(busy)}
          onPress={() => void restore()}
        />
        {state.message ? <StatusMessage>{state.message}</StatusMessage> : null}
      </> : null}
    </Card>
  );
}
