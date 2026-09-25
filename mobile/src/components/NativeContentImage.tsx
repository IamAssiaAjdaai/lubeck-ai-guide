import { Image, type ImageProps } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import { colors } from "../design/tokens";
import { NativeIcon } from "./NativeIcon";
type ContentImageProps = ImageProps & { fallbackSource?: ImageProps["source"] };
export function NativeContentImage(props: ContentImageProps) {
  return (
    <ContentImage
      key={JSON.stringify([props.source, props.fallbackSource])}
      {...props}
    />
  );
}
function ContentImage({
  onError,
  fallbackSource,
  ...props
}: ContentImageProps) {
  const [failures, setFailures] = useState(0);
  const hasFallback =
    fallbackSource &&
    JSON.stringify(fallbackSource) !== JSON.stringify(props.source);
  const source =
    failures === 0
      ? (props.source ?? fallbackSource)
      : failures === 1 && hasFallback && props.source
        ? fallbackSource
        : undefined;
  if (!source)
    return (
      <View
        accessible
        accessibilityLabel={props.accessibilityLabel}
        style={[
          props.style,
          {
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <NativeIcon
          ios="photo"
          android="image"
          color={colors.primary}
          size={32}
        />
      </View>
    );
  return (
    <Image
      {...props}
      source={source}
      onError={(event) => {
        setFailures((value) => value + 1);
        onError?.(event);
      }}
    />
  );
}
