import { SymbolView, type SymbolViewProps } from "expo-symbols";

import { colors } from "../design/tokens";

export function NativeIcon({
  ios,
  android,
  color = colors.text,
  size = 22,
}: Readonly<{
  ios: Extract<SymbolViewProps["name"], string>;
  android: NonNullable<Extract<SymbolViewProps["name"], object>["android"]>;
  color?: string;
  size?: number;
}>) {
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={size}
      tintColor={color}
    />
  );
}
