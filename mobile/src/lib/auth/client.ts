import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "better-auth/react";

import { getConfiguredApiOrigin } from "../api/environment";
import { getNativeAuthConfiguration } from "./configuration";

const configuration = getNativeAuthConfiguration(getConfiguredApiOrigin());

export const nativeAuthClient = createAuthClient({
  baseURL: configuration.baseURL,
  plugins: [
    expoClient({
      scheme: configuration.scheme,
      storagePrefix: configuration.storagePrefix,
      storage: SecureStore,
    }),
  ],
});
