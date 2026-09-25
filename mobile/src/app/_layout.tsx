import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { NativeHeaderActions } from "../components/NativeHeaderActions";
import { colors } from "../design/tokens";
import { NativeLocaleProvider } from "../localization/LocaleProvider";
import { NativeTabScrollProvider } from "../lib/tabNavigation";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NativeLocaleProvider>
          <NativeTabScrollProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.background },
              headerBackButtonDisplayMode: "minimal",
              headerRight: () => <NativeHeaderActions />,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="city/[citySlug]/index" options={{ title: "CITYWALK" }} />
            <Stack.Screen name="city/[citySlug]/place/[placeSlug]" options={{ title: "CITYWALK" }} />
            <Stack.Screen name="city/[citySlug]/tour/[tourSlug]" options={{ title: "CITYWALK" }} />
            <Stack.Screen name="city/[citySlug]/guide/[placeSlug]" options={{ title: "CITYWALK" }} />
            <Stack.Screen name="account/index" options={{ title: "CITYWALK" }} />
          </Stack>
          </NativeTabScrollProvider>
        </NativeLocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
