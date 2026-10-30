import Constants from "expo-constants";
import { Stack } from "expo-router";
import { useState } from "react";
import { Button, Platform, Text, View } from "react-native";

import {
  clearPreviewTesterToken,
  getPreviewTesterToken,
  loginPreviewTester,
  resolveTesterAuth0Config,
} from "../lib/previewTesterAuth0";

function testerConfigurationReady(): boolean {
  try {
    resolveTesterAuth0Config({
      platform: Platform.OS,
      environment: process.env.EXPO_PUBLIC_CITYWALK_ENV,
      apiOrigin: process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN,
      domain: process.env.EXPO_PUBLIC_CITYWALK_TESTER_AUTH0_DOMAIN,
      clientId: process.env.EXPO_PUBLIC_CITYWALK_TESTER_AUTH0_CLIENT_ID,
      packageName: Constants.expoConfig?.android?.package,
    });
    return true;
  } catch {
    return false;
  }
}

export default function PreviewTesterScreen() {
  const enabled = testerConfigurationReady();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Not signed in.");
  const [hasToken, setHasToken] = useState(
    () => Boolean(getPreviewTesterToken()),
  );

  async function signIn() {
    if (!enabled || busy) return;

    setBusy(true);
    setMessage("Opening Auth0 login...");
    try {
      await loginPreviewTester();
      const received = Boolean(getPreviewTesterToken());
      setHasToken(received);
      setMessage(
        received
          ? "Token received. API access not yet verified."
          : "No usable access token received.",
      );
    } catch (error: unknown) {
      clearPreviewTesterToken();
      setHasToken(false);

      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code).slice(0, 80)
          : "unknown";

      const name =
        error instanceof Error ? error.name : "UnknownError";

      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
      setMessage(`Auth0 failed: ${safeName} (${code})`);
    } finally {
      setBusy(false);
    }
  }

  function clearLocalAccess() {
    clearPreviewTesterToken();
    setHasToken(false);
    setMessage("Local token cleared. Browser session may remain.");
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: "#FBFDFF",
      padding: 24,
      justifyContent: "center",
      gap: 20,
    }}>
      <Stack.Screen options={{ title: "Preview Tester" }} />

      <Text style={{
        color: "#09234D",
        fontSize: 26,
        fontWeight: "700",
      }}>
        CITYWALK Preview
      </Text>

      <Text accessibilityRole="text">
        Android tester authentication
      </Text>

      <Text accessibilityRole="text">
        {enabled
          ? "Tester configuration available."
          : "Tester mode disabled or incomplete."}
      </Text>

      <Button
        title={busy ? "Signing in..." : "Sign in with Auth0"}
        disabled={!enabled || busy}
        onPress={() => void signIn()}
        color="#155CAF"
      />

      <Button
        title="Clear local token"
        disabled={busy || !hasToken}
        onPress={clearLocalAccess}
      />

      <Text accessibilityLiveRegion="polite">
        {message}
      </Text>

      <Text style={{ color: "#65738A" }}>
        Preview API requests remain disabled until separate
        Worker approval. No JWT is displayed or logged.
      </Text>
    </View>
  );
}
