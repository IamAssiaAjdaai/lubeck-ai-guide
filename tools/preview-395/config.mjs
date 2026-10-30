import { bindings } from 'cf/config';
import { previewTextValues } from './policy.mjs';

// A new config from an allowlist. Never import/spread the production config.
export function previewConfig(profile) {
  return {
    worker: {
      name: profile.worker,
      entrypoint: './tools/preview-395/entrypoint.ts',
      compatibilityDate: '2026-10-03',
      compatibilityFlags: ['nodejs_compat'],
      assets: { notFoundHandling: 'none', runWorkerFirst: true },
      domains: [],
      triggers: [],
      env: {
        ASSETS: bindings.assets(),
        HYPERDRIVE: bindings.hyperdrive({ id: profile.hyperdriveId }),
        ...Object.fromEntries(Object.entries(previewTextValues(profile)).map(([key, value]) => [key, bindings.text(value)])),
        BETTER_AUTH_SECRET: bindings.secret(),
        CITYWALK_PREVIEW_PASSWORD: bindings.secret(),

      },
    },
  };
}
