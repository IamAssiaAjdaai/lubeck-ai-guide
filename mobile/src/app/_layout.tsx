import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "../design/tokens";
import { NativeLocaleProvider } from "../localization/LocaleProvider";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NativeLocaleProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.background },
              headerBackButtonDisplayMode: "minimal",
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="city/[citySlug]/index" options={{ title: "CITYWALK" }} />
            <Stack.Screen name="city/[citySlug]/place/[placeSlug]" options={{ title: "CITYWALK" }} />
            <Stack.Screen name="account/index" options={{ title: "CITYWALK" }} />
          </Stack>
        </NativeLocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
