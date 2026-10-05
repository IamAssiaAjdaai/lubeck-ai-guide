import "server-only";

import {
  CITYWALK_ANDROID_PACKAGE,
  CITYWALK_IOS_BUNDLE_IDENTIFIER,
} from "@/lib/nativeAppHandoff";

export function buildAppleAppSiteAssociation(teamId = process.env.CITYWALK_APPLE_TEAM_ID) {
  const normalizedTeamId = teamId?.trim();
  if (!normalizedTeamId) return undefined;

  const appId = `${normalizedTeamId}.${CITYWALK_IOS_BUNDLE_IDENTIFIER}`;
  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          paths: ["/open/*"],
        },
      ],
    },
  } as const;
}

export function buildAndroidAssetLinks(
  fingerprints = process.env.CITYWALK_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS,
) {
  const values = fingerprints
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values?.length) return undefined;

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: CITYWALK_ANDROID_PACKAGE,
        sha256_cert_fingerprints: values,
      },
    },
  ] as const;
}
