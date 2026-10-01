import { Platform } from "react-native";

import type { CitywalkLiveActivityProps } from "./liveWalk";

async function getFactory() {
  if (Platform.OS !== "ios") return undefined;
  return (await import("../widgets/CitywalkLiveActivity")).default;
}

export async function upsertCitywalkLiveActivity(
  props: CitywalkLiveActivityProps,
  url?: string,
): Promise<boolean> {
  try {
    const factory = await getFactory();
    if (!factory) return false;
    const instances = factory.getInstances();
    const current = instances[0];

    if (current) {
      await current.update(props);
    } else {
      factory.start(props, url);
    }

    for (const duplicate of instances.slice(1)) {
      await duplicate.end("immediate");
    }
    return true;
  } catch {
    return false;
  }
}

export async function endCitywalkLiveActivity(
  finalProps?: CitywalkLiveActivityProps,
): Promise<void> {
  try {
    const factory = await getFactory();
    if (!factory) return;
    for (const instance of factory.getInstances()) {
      await instance.end("immediate", finalProps, new Date());
    }
  } catch {
    // Live Walk cleanup is best effort. Location tracking is stopped separately.
  }
}
