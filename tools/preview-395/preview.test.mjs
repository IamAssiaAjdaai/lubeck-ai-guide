import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { previewConfig } from './config.mjs';
import { profile, validate, provenance, root } from './preflight.mjs';
import { createPreviewFetch } from './guard.mjs';
import path from 'node:path';

const origin = 'https://citywalk-preview-395-7b99bf8.synthetic.workers.dev';
const environment = {
  CITYWALK_PREVIEW_ORIGIN: origin,
  CITYWALK_PREVIEW_PASSWORD: 'synthetic-local-preview-password-395-only',
  CITYWALK_RUNTIME_ENV: 'preview',
  BETTER_AUTH_SECRET: 'synthetic-preview-395-auth-test-only-00000000',
  CITYWALK_PREVIEW_DB_HOST: 'synthetic-db-395.invalid',
  CITYWALK_PREVIEW_DB_NAME: 'citywalk_preview_395',
  ...Object.fromEntries(Object.entries(previewConfig({ ...profile, origin }).worker.env).filter(([, binding]) => binding.type === 'text').map(([key, binding]) => [key, binding.value])),
  HYPERDRIVE: { connectionString: 'postgresql://synthetic:synthetic@synthetic-db-395.invalid/citywalk_preview_395' },
};
const auth = `Basic ${btoa(`founder:${environment.CITYWALK_PREVIEW_PASSWORD}`)}`;
function request(route, method = 'GET', authenticated = true) {
  return new Request(origin + route, { method, headers: authenticated ? { Authorization: auth } : {} });
}

test('exact branch, HEAD, preserved commits and original source hashes', () => assert.ok(provenance() > 20));
test('sanitized draft passes; deployable mode fails on placeholders', () => {
  assert.equal(validate(previewConfig(profile), profile), true);
  assert.throws(() => validate(previewConfig(profile), profile, true), /Unprovisioned Hyperdrive/);
});
for (const [label, mutate] of [
  ['production Worker', c => { c.worker.name = 'citywalk-production'; }],
  ['production Hyperdrive', c => { c.worker.env.HYPERDRIVE.id = '390958927c2946be8571ec5282b35ce6'; }],
  ['unknown Hyperdrive', c => { c.worker.env.HYPERDRIVE.id = '11111111111111111111111111111111'; }],
  ['production domain', c => { c.worker.domains = ['getcitywalk.com']; }],
  ['cron', c => { c.worker.triggers = [{ type: 'scheduled', schedule: '* * * * *' }]; }],
  ['provider secret', c => { c.worker.env.GROQ_API_KEY = { type: 'secret' }; }],
  ['production secret value', c => { c.worker.env.BETTER_AUTH_SECRET.value = 'do-not-use'; }],
  ['remote storage binding', c => { c.worker.env.MEDIA = { type: 'r2', bucketName: 'production' }; }],
  ['workflow binding', c => { c.worker.env.JOBS = { type: 'workflow', name: 'live' }; }],
  ['database URL', c => { c.worker.env.DATABASE_URL = { type: 'secret' }; }],
  ['media key', c => { c.worker.env.CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY = { type: 'secret' }; }],
  ['analytics', c => { c.worker.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = { type: 'text', value: 'live' }; }],
  ['asset auth bypass', c => { c.worker.assets.runWorkerFirst = false; }],
  ['production entrypoint', c => { c.worker.entrypoint = './src/cloudflare/entrypoint.ts'; }],
]) test(`reject ${label}`, () => { const config = structuredClone(previewConfig(profile)); mutate(config); assert.throws(() => validate(config, profile)); });

test('actual installed typed config parser accepts sanitized config structure', async () => {
  const { resolveAndParseConfig } = await import('@cloudflare/config');
  const result = await resolveAndParseConfig(previewConfig(profile), { mode: 'preview395', isPreview: true });
  assert.ok(result.success, result.success ? '' : result.error.message);
});
test('installed Vinext cf branch only forwards mode, not config/name', () => {
  const source = readFileSync(path.join(root, 'node_modules/@vinext/cloudflare/dist/deploy.js'), 'utf8');
  const body = source.slice(source.indexOf('function buildCfDeployArgs('), source.indexOf('/**', source.indexOf('function buildCfDeployArgs(')));
  assert.match(body, /\["deploy", "--prebuilt"\]/);
  assert.match(body, /"--mode"/);
  assert.doesNotMatch(body, /options\.config|options\.name/);
  assert.match(source, /--name is not supported for cloudflare.config.ts projects/);
});
test('no provider credentials, real auth, missing protection or foreign host reaches application', async () => {
  let calls = 0;
  const fetch = createPreviewFetch(async () => { calls++; return new Response('unexpected'); });
  assert.equal((await fetch(request('/', 'GET', false), environment)).status, 401);
  assert.equal((await fetch(request('/'), { ...environment, CITYWALK_PREVIEW_PASSWORD: '' })).status, 503);
  assert.equal((await fetch(new Request('https://getcitywalk.com/', { headers: { Authorization: auth } }), environment)).status, 421);
  assert.equal((await fetch(request('/'), { ...environment, GROQ_API_KEY: 'do-not-use' })).status, 503);
  assert.equal((await fetch(request('/'), { ...environment, BETTER_AUTH_SECRET: 'not-synthetic' })).status, 503);
  assert.equal((await fetch(request('/'), { ...environment, CITYWALK_RUNTIME_ENV: 'production' })).status, 503);
  assert.equal(calls, 0);
});
for (const route of ['/', '/privacy', '/terms', '/imprint', '/support', '/account-deletion', '/api/health', '/api/content/cities', '/api/content/cities/lubeck', '/api/content/cities/lubeck/summary', '/api/content/cities/lubeck/places/holstentor', '/api/content/image', '/.well-known/apple-app-site-association', '/.well-known/assetlinks.json', '/open/lubeck/synthetic', '/images/citywalk-hero.png', '/_next/static/chunks/index-123.js', '/_next/static/css/LandingPreview.123.css']) {
  test(`delegates exact dynamic route ${route}, preserving method/query/status and noindex`, async () => {
    let seen;
    const fetch = createPreviewFetch(async req => { seen = req; return new Response('synthetic handler', { status: 200 }); });
    const response = await fetch(request(route + '?probe=1'), environment);
    assert.equal(seen.url, origin + route + '?probe=1');
    assert.equal(seen.method, 'GET');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
    assert.equal(response.headers.get('Location'), null);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  });
}
for (const [route, method] of [['/api/guide', 'POST'], ['/api/commerce/checkout', 'POST'], ['/api/commerce/webhooks/revenuecat', 'POST'], ['/api/commerce/native/notifications/apple', 'POST'], ['/api/commerce/native/notifications/google', 'POST'], ['/api/analytics/marketing-funnel', 'POST'], ['/api/account/delete', 'DELETE'], ['/api/account/delete-request', 'POST'], ['/api/account/delete-confirm', 'POST'], ['/api/auth/sign-in/email', 'POST'], ['/api/auth/callback/google', 'GET'], ['/api/guide/eligibility', 'GET']]) {
  test(`provider/write disabled ${method} ${route}`, async () => {
    const fetch = createPreviewFetch(() => { throw Error('provider path reached application'); });
    assert.equal((await fetch(request(route, method), environment)).status, 503);
  });
}
test('robots denies all and sitemap contains no synthetic legal URLs', async () => {
  const fetch = createPreviewFetch(() => { throw Error('must not delegate'); });
  assert.match(await (await fetch(request('/robots.txt'), environment)).text(), /Disallow: \//);
  assert.doesNotMatch(await (await fetch(request('/sitemap.xml'), environment)).text(), /<loc>|getcitywalk/);
});
test('wrong database never reaches application', async () => {
  const fetch = createPreviewFetch(() => { throw Error('database reached'); });
  assert.equal((await fetch(request('/'), { ...environment, HYPERDRIVE: { connectionString: 'postgresql://x:x@foreign.invalid/other' } })).status, 503);
});
test('external redirects rejected, same-origin auth redirect retained', async () => {
  const external = createPreviewFetch(() => Response.redirect('https://getcitywalk.com/api/auth', 302));
  assert.equal((await external(request('/'), environment)).status, 503);
  const local = createPreviewFetch(() => Response.redirect(origin + '/account', 302));
  assert.equal((await local(request('/'), environment)).status, 302);
});
test('entrypoint exports no scheduled handler', () => {
  const source = readFileSync(new URL('./entrypoint.ts', import.meta.url), 'utf8');
  assert.match(source, /const preview = \{ fetch:/);
  assert.match(source, /export default preview/);
  assert.doesNotMatch(source, /scheduled\s*[:(]/);
});


test('preview credential removed from delegate request AND environment; safe cookies and request semantics retained', async () => {
  const controller = new AbortController();
  const ctx = { waitUntil() {} };
  const original = new Request(origin + '/?locale=en&_rsc=synthetic', {
    method: 'GET', credentials: 'include', cache: 'no-cache', redirect: 'manual',
    signal: controller.signal,
    headers: { Authorization: auth, 'Proxy-Authorization': auth,
      Cookie: 'better-auth.session_token=synthetic-cookie; preferred_locale=en',
      RSC: '1', 'Next-Router-State-Tree': '["synthetic"]',
      'If-None-Match': '"synthetic-etag"', 'Accept-Language': 'en', Range: 'bytes=0-10' },
  });
  const fetch = createPreviewFetch(async (req, env, context) => {
    assert.notEqual(req, original);
    assert.equal(req.headers.get('Authorization'), null);
    assert.equal(req.headers.get('Proxy-Authorization'), null);
    assert.ok(!Object.hasOwn(env, 'CITYWALK_PREVIEW_PASSWORD'));
    assert.ok(!JSON.stringify([...req.headers]).includes(environment.CITYWALK_PREVIEW_PASSWORD));
    assert.ok(!JSON.stringify(env).includes(environment.CITYWALK_PREVIEW_PASSWORD));
    for (const key of ['cookie', 'rsc', 'next-router-state-tree', 'if-none-match', 'accept-language', 'range']) {
      assert.equal(req.headers.get(key), original.headers.get(key));
    }
    for (const key of ['url', 'method', 'credentials', 'cache', 'redirect']) assert.equal(req[key], original[key]);
    controller.abort();
    assert.equal(req.signal.aborted, true);
    assert.equal(context, ctx);
    assert.equal(env.HYPERDRIVE, environment.HYPERDRIVE);
    return new Response('read only', { headers: { 'Set-Cookie': 'preferred_locale=en; Secure; HttpOnly; SameSite=Lax' } });
  });
  const response = await fetch(original, environment, ctx);
  assert.match(response.headers.get('Set-Cookie'), /preferred_locale=en/);
  assert.equal(original.headers.get('Authorization'), auth, 'caller request is not mutated');
  assert.equal(environment.CITYWALK_PREVIEW_PASSWORD, 'synthetic-local-preview-password-395-only');
});

for (const route of ['/api/auth/get-session', '/api/account/export', '/api/auth/sign-out',
  '/api/auth/verify-email', '/api/auth/callback/apple', '/api/auth/callback/google',
  '/api/account/delete-confirm', '/api/account/delete-request', '/api/account/reset-token',
  '/api/account/saved-walks', '/api/admin/place-search', '/api/media/synthetic', '/admin', '/explore',
  '/api/locale', '/api/new-future-route', '/api/health/extra', '/privacy/extra', '/open/lubeck/x/extra',
  '/_next/image?url=https://provider.invalid/image', '/_next/static/chunks/app.js.map',
  '/_next/static/config.json', '/images/unknown.png', '/api/%63ontent/cities', '/missing-route']) {
  test(`unaudited/side-effect route blocked for GET HEAD OPTIONS: ${route}`, async () => {
    const fetch = createPreviewFetch(() => { throw Error('unreviewed read reached application'); });
    for (const method of ['GET', 'HEAD', 'OPTIONS']) assert.equal((await fetch(request(route, method), environment)).status, 503);
  });
}
for (const route of ['/api/guide', '/api/guide/eligibility', '/api/commerce/checkout',
  '/api/commerce/webhooks/stripe', '/api/commerce/webhooks/revenuecat',
  '/api/commerce/native/context', '/api/commerce/native/notifications/apple',
  '/api/commerce/native/notifications/google', '/api/analytics/marketing-funnel',
  '/api/internal/marketing/content/synthetic/published']) {
  test(`provider fails closed for every supported request method: ${route}`, async () => {
    const fetch = createPreviewFetch(() => { throw Error('provider reached'); });
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal((await fetch(request(route, method), environment)).status, 503);
    }
  });
}
test('reviewed OPTIONS answered locally without DB/CORS/delegate', async () => {
  const fetch = createPreviewFetch(() => { throw Error('OPTIONS delegated'); });
  const response = await fetch(request('/api/content/cities', 'OPTIONS'), { ...environment, HYPERDRIVE: undefined });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Allow'), 'GET, HEAD, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});
test('HEAD retains method and headers, but returns no body', async () => {
  const fetch = createPreviewFetch(async req => {
    assert.equal(req.method, 'HEAD');
    assert.equal(req.headers.get('Authorization'), null);
    return new Response('not returned', { status: 200, headers: { ETag: '"synthetic"' } });
  });
  const response = await fetch(request('/', 'HEAD'), environment);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('ETag'), '"synthetic"');
});
for (const [key, value] of Object.entries({
  DATABASE_URL: 'postgresql://production.invalid/live', STRIPE_SECRET_KEY: 'do-not-use',
  COMMERCE_REVENUECAT_SECRET_API_KEY: 'do-not-use', RESEND_API_KEY: 'do-not-use',
  CITYWALK_GOOGLE_OAUTH_CLIENT_SECRET: 'do-not-use', CITYWALK_APPLE_PRIVATE_KEY: 'do-not-use',
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'do-not-use', CITYWALK_PROVIDER_APPROVAL: 'true',
  CITYWALK_MEDIA_S3_BUCKET: 'production-bucket', CITYWALK_MEDIA_S3_ENDPOINT: 'https://storage.invalid',
  CITYWALK_MEDIA_S3_ACCESS_KEY_ID: 'do-not-use', UNEXPECTED_SECRET: 'do-not-use',
  CITYWALK_CONTENT_SOURCE: 'database', CITYWALK_PREVIEW_DB_NAME: 'production',
})) test(`runtime rejects unexpected or production binding ${key}`, async () => {
  const fetch = createPreviewFetch(() => { throw Error('unsafe runtime delegated'); });
  assert.equal((await fetch(request('/'), { ...environment, [key]: value })).status, 503);
});
test('deployment lock stays mandatory even when resources and all review labels look provisioned', () => {
  const selected = { ...profile, origin, hyperdriveId: '11111111111111111111111111111111',
    databaseHost: 'reviewed-synthetic.example', resourceReview: 'APPROVED', accessReview: 'APPROVED', runtimeReview: 'APPROVED' };
  assert.throws(() => validate(previewConfig(selected), selected, true), /never authorizes or performs deployment/);
});
for (const [key, value] of Object.entries({ worker: 'citywalk-production', origin: 'https://getcitywalk.com',
  hyperdriveId: '390958927c2946be8571ec5282b35ce6', databaseHost: 'db.getcitywalk.com',
  databaseName: 'citywalk_production', mediaBucket: 'citywalk-production' })) {
  test(`profile rejects production ${key}`, () => {
    const selected = { ...profile, [key]: value };
    assert.throws(() => validate(previewConfig(selected), selected));
  });
}

for (const header of ['next-action', 'x-rsc-action', 'x-http-method-override', 'x-method-override']) {
  test(`read methods reject action/method-override header ${header}`, async () => {
    const fetch = createPreviewFetch(() => { throw Error('action/override delegated'); });
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const incoming = request('/', method);
      incoming.headers.set(header, 'synthetic');
      assert.equal((await fetch(incoming, environment)).status, 503);
    }
  });
}
test('unknown profile secrets cannot be smuggled into generation', () => {
  const selected = { ...profile, DATABASE_URL: 'postgresql://do-not-use.invalid/production' };
  assert.throws(() => validate(previewConfig(selected), selected), /Unexpected profile fields/);
});
