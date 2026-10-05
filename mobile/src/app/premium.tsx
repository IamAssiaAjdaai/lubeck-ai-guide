import { router, Stack } from "expo-router";

import { RevenueCatPremiumCard } from "../components/RevenueCatPremiumCard";
import { AppText, PrimaryButton, Screen } from "../components/ui";
import { nativeAuthClient } from "../lib/auth/client";
import { premiumEnabled } from "../lib/revenueCatPremiumCore";

export default function PremiumScreen() {
  const { data: session, isPending } = nativeAuthClient.useSession();

  return (
    <Screen>
      <Stack.Screen options={{ title: "CITYWALK Premium" }} />
      <AppText variant="screenTitle">CITYWALK Premium</AppText>
      <AppText variant="metadata">
        Premium access across available CITYWALK cities. Store prices are shown in your local currency.
      </AppText>

      {!premiumEnabled() ? (
        <AppText variant="metadata">Premium subscriptions are not enabled in this build.</AppText>
      ) : isPending ? (
        <AppText variant="metadata">Checking your CITYWALK account…</AppText>
      ) : session?.user.id ? (
        <RevenueCatPremiumCard account={session.user.id} />
      ) : <>
        <AppText variant="metadata">Sign in before purchasing or restoring Premium.</AppText>
        <PrimaryButton
          label="Sign in"
          onPress={() => router.push({ pathname: "/account", params: { entry: "sign-in" } })}
        />
      </>}
    </Screen>
  );
}
