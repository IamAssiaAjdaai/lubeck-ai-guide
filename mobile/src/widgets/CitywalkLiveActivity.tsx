import {
  Circle,
  HStack,
  Image,
  Rectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

import type { CitywalkLiveActivityProps } from "../lib/liveWalk";

const CitywalkLiveActivity = (props: CitywalkLiveActivityProps) => {
  "widget";

  // expo-widgets serializes only this function body into the isolated widget
  // runtime. Keep every runtime value inside the widget function.
  const BLUE = "#6EB6FF";
  const NAVY = "#081624";
  const MUTED = "#AFC0CE";
  const SOFT = "#E7EEF5";
  const STORY = "#D9F3FF";
  const LINE = "#45596C";
  const WHITE = "#FFFFFF";

  const icon =
    props.state === "arrived"
      ? "checkmark.circle.fill"
      : props.state === "take_back"
        ? "arrow.uturn.backward.circle.fill"
        : "location.fill";
  const routeIcon = props.storyLabel ? "book.fill" : "figure.walk";
  const routeColor = props.storyLabel ? STORY : SOFT;
  const routeLabel = props.storyLabel ?? props.distanceEta;
  const showProgress = props.state !== "take_back" && props.totalStops > 0;
  const count = Math.max(1, Math.min(props.totalStops, 7));
  const current = Math.min(Math.max(props.visitedCount, 0), count - 1);
  const timingLabel = props.remainingLabel + " · " + props.finishLabel;

  const progressDots = showProgress ? (
    <HStack spacing={0}>
      {Array.from({ length: count }).map((_, index) => {
        const complete = index < props.visitedCount;
        const active = index === current && props.visitedCount < props.totalStops;
        return (
          <HStack key={index} spacing={0}>
            {index > 0 ? (
              <Rectangle
                modifiers={[
                  frame({ width: 18, height: 1 }),
                  foregroundStyle(index <= props.visitedCount ? BLUE : LINE),
                ]}
              />
            ) : null}
            {active ? (
              <ZStack>
                <Circle
                  modifiers={[
                    frame({ width: 18, height: 18 }),
                    foregroundStyle(BLUE),
                  ]}
                />
                <Circle
                  modifiers={[
                    frame({ width: 8, height: 8 }),
                    foregroundStyle(NAVY),
                  ]}
                />
              </ZStack>
            ) : (
              <Circle
                modifiers={[
                  frame({ width: 10, height: 10 }),
                  foregroundStyle(complete ? BLUE : LINE),
                ]}
              />
            )}
          </HStack>
        );
      })}
    </HStack>
  ) : null;

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[
          padding({ horizontal: 14, vertical: 8 }),
          background(NAVY),
          cornerRadius(20),
        ]}
      >
        <HStack spacing={5}>
          <Image systemName={icon} color={BLUE} />
          <Text
            modifiers={[
              font({ size: 9, weight: "medium" }),
              foregroundStyle(MUTED),
              lineLimit(1),
            ]}
          >
            {props.cityLabel}
          </Text>
          <Spacer />
          {props.scheduleLabel ? (
            <Text
              modifiers={[
                font({ size: 8, weight: "semibold" }),
                foregroundStyle(BLUE),
                lineLimit(1),
              ]}
            >
              {props.scheduleLabel}
            </Text>
          ) : null}
        </HStack>

        <Text
          modifiers={[
            font({ size: 9, weight: "semibold" }),
            foregroundStyle(BLUE),
            lineLimit(1),
          ]}
        >
          {props.stateLabel}
        </Text>

        <Text
          modifiers={[
            font({ size: 19, weight: "bold" }),
            foregroundStyle(WHITE),
            lineLimit(1),
          ]}
        >
          {props.destination}
        </Text>

        {routeLabel ? (
          <HStack spacing={4}>
            <Image systemName={routeIcon} color={routeColor} />
            <Text
              modifiers={[
                font({ size: 10, weight: "medium" }),
                foregroundStyle(routeColor),
                lineLimit(1),
              ]}
            >
              {routeLabel}
            </Text>
          </HStack>
        ) : null}

        {showProgress ? (
          <HStack spacing={7}>
            {progressDots}
            <Spacer />
            <Text
              modifiers={[
                font({ size: 8, weight: "medium" }),
                foregroundStyle(MUTED),
                lineLimit(1),
              ]}
            >
              {props.progressLabel}
            </Text>
          </HStack>
        ) : null}

        <Text
          modifiers={[
            font({ size: 9, weight: "medium" }),
            foregroundStyle(MUTED),
            lineLimit(1),
          ]}
        >
          {timingLabel}
        </Text>
      </VStack>
    ),

    bannerSmall: (
      <HStack
        spacing={7}
        modifiers={[
          padding({ horizontal: 11, vertical: 9 }),
          background(NAVY),
          cornerRadius(17),
        ]}
      >
        <Image systemName={icon} color={BLUE} />
        <VStack alignment="leading" spacing={1}>
          <Text
            modifiers={[
              font({ size: 8, weight: "medium" }),
              foregroundStyle(MUTED),
              lineLimit(1),
            ]}
          >
            {props.cityLabel}
          </Text>
          <Text
            modifiers={[
              font({ size: 8, weight: "semibold" }),
              foregroundStyle(BLUE),
              lineLimit(1),
            ]}
          >
            {props.stateLabel}
          </Text>
          <Text
            modifiers={[
              font({ size: 13, weight: "bold" }),
              foregroundStyle(WHITE),
              lineLimit(1),
            ]}
          >
            {props.destination}
          </Text>
          <Text
            modifiers={[
              font({ size: 9, weight: "medium" }),
              foregroundStyle(SOFT),
              lineLimit(1),
            ]}
          >
            {routeLabel ?? timingLabel}
          </Text>
        </VStack>
      </HStack>
    ),

    compactLeading: <Image systemName={icon} color={BLUE} />,
    compactTrailing: (
      <Text
        modifiers={[
          font({ size: 12, weight: "bold" }),
          foregroundStyle(WHITE),
        ]}
      >
        {props.compactEta}
      </Text>
    ),
    minimal: <Image systemName={icon} color={BLUE} />,

    expandedLeading: (
      <Image
        systemName={icon}
        color={BLUE}
        modifiers={[padding({ leading: 8 })]}
      />
    ),
    expandedCenter: (
      <VStack alignment="leading" spacing={1}>
        <Text
          modifiers={[
            font({ size: 8, weight: "medium" }),
            foregroundStyle(MUTED),
            lineLimit(1),
          ]}
        >
          {props.cityLabel}
        </Text>
        <Text
          modifiers={[
            font({ size: 8, weight: "semibold" }),
            foregroundStyle(BLUE),
            lineLimit(1),
          ]}
        >
          {props.stateLabel}
        </Text>
        <Text
          modifiers={[
            font({ size: 17, weight: "bold" }),
            foregroundStyle(WHITE),
            lineLimit(2),
          ]}
        >
          {props.destination}
        </Text>
        {routeLabel ? (
          <HStack spacing={4}>
            <Image systemName={routeIcon} color={routeColor} />
            <Text
              modifiers={[
                font({ size: 10, weight: "medium" }),
                foregroundStyle(routeColor),
                lineLimit(1),
              ]}
            >
              {routeLabel}
            </Text>
          </HStack>
        ) : null}
      </VStack>
    ),
    expandedTrailing: (
      <Text
        modifiers={[
          padding({ trailing: 8 }),
          font({ size: 13, weight: "bold" }),
          foregroundStyle(WHITE),
        ]}
      >
        {props.compactEta}
      </Text>
    ),
    expandedBottom: (
      <VStack spacing={4} modifiers={[padding({ horizontal: 8, bottom: 7 })]}>
        {showProgress ? (
          <HStack spacing={7}>
            {progressDots}
            <Spacer />
            <Text
              modifiers={[
                font({ size: 8, weight: "medium" }),
                foregroundStyle(MUTED),
                lineLimit(1),
              ]}
            >
              {props.progressLabel}
            </Text>
          </HStack>
        ) : null}
        <HStack spacing={6}>
          <Text
            modifiers={[
              font({ size: 9, weight: "medium" }),
              foregroundStyle(MUTED),
              lineLimit(1),
            ]}
          >
            {timingLabel}
          </Text>
          <Spacer />
          {props.scheduleLabel ? (
            <HStack spacing={3}>
              <Text
                modifiers={[
                  font({ size: 8, weight: "semibold" }),
                  foregroundStyle(BLUE),
                  lineLimit(1),
                ]}
              >
                {props.scheduleLabel}
              </Text>
              <Image systemName="checkmark" color={BLUE} />
            </HStack>
          ) : null}
        </HStack>
      </VStack>
    ),
  };
};

export default createLiveActivity<CitywalkLiveActivityProps>(
  "CitywalkLiveActivity",
  CitywalkLiveActivity,
);
