import {
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  lineLimit,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

import type { CitywalkLiveActivityProps } from "../lib/liveWalk";

const CitywalkLiveActivity = (props: CitywalkLiveActivityProps) => {
  "widget";

  return {
    banner: (
      <VStack
        spacing={8}
        modifiers={[
          padding({ all: 16 }),
          background("#081624"),
          cornerRadius(22),
        ]}
      >
        <Text
          modifiers={[
            font({ size: 12, weight: "semibold" }),
            foregroundStyle("#58B9EA"),
          ]}
        >
          {props.cityLabel}
        </Text>
        <Text
          modifiers={[
            font({ size: 11, weight: "semibold" }),
            foregroundStyle("#91A4B5"),
          ]}
        >
          {props.stateLabel}
        </Text>
        <Text
          modifiers={[
            font({ size: 20, weight: "bold" }),
            foregroundStyle("#FFFFFF"),
            lineLimit(2),
          ]}
        >
          {props.destination}
        </Text>
        {props.storyLabel ? (
          <Text
            modifiers={[
              font({ size: 13, weight: "medium" }),
              foregroundStyle("#D9F3FF"),
            ]}
          >
            {props.storyLabel}
          </Text>
        ) : props.distanceEta ? (
          <Text
            modifiers={[
              font({ size: 14, weight: "medium" }),
              foregroundStyle("#D5DEE6"),
            ]}
          >
            {props.distanceEta}
          </Text>
        ) : null}
        <ProgressView value={props.progress} modifiers={[tint("#159ED5")]} />
        <HStack>
          <Text
            modifiers={[
              font({ size: 12, weight: "medium" }),
              foregroundStyle("#D5DEE6"),
            ]}
          >
            {props.progressLabel}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 12, weight: "medium" }),
              foregroundStyle("#D5DEE6"),
            ]}
          >
            {props.remainingLabel}
          </Text>
        </HStack>
        <HStack>
          <Text
            modifiers={[
              font({ size: 12, weight: "medium" }),
              foregroundStyle("#FFFFFF"),
            ]}
          >
            {props.finishLabel}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 12, weight: "semibold" }),
              foregroundStyle(
                props.scheduleLabel ? "#58B9EA" : "#91A4B5",
              ),
            ]}
          >
            {props.scheduleLabel ?? props.deadlineLabel ?? ""}
          </Text>
        </HStack>
      </VStack>
    ),
    bannerSmall: (
      <HStack
        spacing={8}
        modifiers={[
          padding({ all: 12 }),
          background("#081624"),
          cornerRadius(18),
        ]}
      >
        <Image systemName="location.fill" modifiers={[foregroundStyle("#159ED5")]} />
        <VStack spacing={2}>
          <Text
            modifiers={[
              font({ size: 13, weight: "bold" }),
              foregroundStyle("#FFFFFF"),
              lineLimit(1),
            ]}
          >
            {props.destination}
          </Text>
          <Text
            modifiers={[
              font({ size: 11, weight: "medium" }),
              foregroundStyle("#D5DEE6"),
            ]}
          >
            {props.distanceEta ?? props.storyLabel ?? props.finishLabel}
          </Text>
        </VStack>
      </HStack>
    ),
    compactLeading: (
      <Image systemName="location.fill" modifiers={[foregroundStyle("#159ED5")]} />
    ),
    compactTrailing: (
      <Text
        modifiers={[
          font({ size: 12, weight: "bold" }),
          foregroundStyle("#FFFFFF"),
        ]}
      >
        {props.compactEta}
      </Text>
    ),
    minimal: (
      <Image systemName="location.fill" modifiers={[foregroundStyle("#159ED5")]} />
    ),
    expandedLeading: (
      <Text
        modifiers={[
          padding({ leading: 8 }),
          font({ size: 12, weight: "semibold" }),
          foregroundStyle("#58B9EA"),
        ]}
      >
        CITYWALK
      </Text>
    ),
    expandedCenter: (
      <VStack spacing={2}>
        <Text
          modifiers={[
            font({ size: 11, weight: "semibold" }),
            foregroundStyle("#91A4B5"),
          ]}
        >
          {props.stateLabel}
        </Text>
        <Text
          modifiers={[
            font({ size: 15, weight: "bold" }),
            foregroundStyle("#FFFFFF"),
            lineLimit(2),
          ]}
        >
          {props.destination}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <Text
        modifiers={[
          padding({ trailing: 8 }),
          font({ size: 13, weight: "bold" }),
          foregroundStyle("#FFFFFF"),
        ]}
      >
        {props.compactEta}
      </Text>
    ),
    expandedBottom: (
      <VStack spacing={5} modifiers={[padding({ horizontal: 8, bottom: 8 })]}>
        <ProgressView value={props.progress} modifiers={[tint("#159ED5")]} />
        <HStack>
          <Text
            modifiers={[
              font({ size: 11, weight: "medium" }),
              foregroundStyle("#D5DEE6"),
            ]}
          >
            {props.progressLabel}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 11, weight: "medium" }),
              foregroundStyle("#D5DEE6"),
            ]}
          >
            {props.remainingLabel}
          </Text>
        </HStack>
      </VStack>
    ),
  };
};

export default createLiveActivity<CitywalkLiveActivityProps>(
  "CitywalkLiveActivity",
  CitywalkLiveActivity,
);
