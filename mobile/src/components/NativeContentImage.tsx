import { Image, type ImageProps } from "expo-image";
import { useState } from "react";
import { View } from "react-native";
import { colors } from "../design/tokens";
import { NativeIcon } from "./NativeIcon";
export function NativeContentImage(props: ImageProps) {
  return <ContentImage key={JSON.stringify(props.source)} {...props} />;
}
function ContentImage({ onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed || !props.source)
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
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
