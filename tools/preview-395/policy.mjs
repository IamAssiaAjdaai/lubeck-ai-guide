// Shared binding allowlist: no production config import and no provider credentials.
export function previewTextValues(profile) {
  return {
    CITYWALK_CONTENT_SOURCE: 'code',
    CITYWALK_DATABASE_RUNTIME: 'hyperdrive',
    CITYWALK_RUNTIME_ENV: 'preview',
    CITYWALK_MEDIA_STORAGE: 's3',
    CITYWALK_MEDIA_S3_BUCKET: profile.mediaBucket,
    BETTER_AUTH_URL: profile.origin,
    CITYWALK_PREVIEW_ORIGIN: profile.origin,
    CITYWALK_PREVIEW_DB_HOST: profile.databaseHost,
    CITYWALK_PREVIEW_DB_NAME: profile.databaseName,
    CITYWALK_LEGAL_ENTITY_TYPE: 'individual',
    CITYWALK_LEGAL_OPERATOR_NAME: 'SYNTHETIC PREVIEW — NOT LEGAL APPROVAL',
    CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: 'SYNTHETIC PREVIEW — NOT A REAL ADDRESS',
    CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: 'SYNTHETIC PREVIEW — NOT A REAL CITY',
    CITYWALK_LEGAL_OPERATOR_COUNTRY: 'SYNTHETIC PREVIEW — NOT A LEGAL DISCLOSURE',
  };
}
export function safeRuntimeEnvironment(env) {
  const expected = previewTextValues({
    origin: env.CITYWALK_PREVIEW_ORIGIN,
    databaseHost: env.CITYWALK_PREVIEW_DB_HOST,
    databaseName: env.CITYWALK_PREVIEW_DB_NAME,
    mediaBucket: 'citywalk-preview-395-synthetic',
  });
  const allowed = new Set([...Object.keys(expected), 'ASSETS', 'HYPERDRIVE', 'BETTER_AUTH_SECRET', 'CITYWALK_PREVIEW_PASSWORD']);
  return Object.keys(env).every(key => allowed.has(key)) &&
    Object.entries(expected).every(([key, value]) => env[key] === value) &&
    /^citywalk_preview_395(?:_[a-z0-9]+)?$/.test(env.CITYWALK_PREVIEW_DB_NAME ?? '') &&
    typeof env.CITYWALK_PREVIEW_DB_HOST === 'string' &&
    /^[a-z0-9.-]+$/.test(env.CITYWALK_PREVIEW_DB_HOST) &&
    !env.CITYWALK_PREVIEW_DB_HOST.includes('getcitywalk') &&
    typeof env.BETTER_AUTH_SECRET === 'string' &&
    env.BETTER_AUTH_SECRET.startsWith('synthetic-preview-395-') && env.BETTER_AUTH_SECRET.length >= 32;
}
