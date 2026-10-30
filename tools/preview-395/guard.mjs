import { safeRuntimeEnvironment } from './policy.mjs';
import { isReviewedReadPath } from './routes.mjs';

const headers = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'Cache-Control': 'private, no-store',
  'X-Citywalk-Preview': 'Synthetic restricted preview; no legal approval',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-src 'none'; form-action 'self'; base-uri 'self'",
  'Referrer-Policy': 'no-referrer',
};
function reply(body, status, extra = {}) {
  return new Response(body, { status, headers: { ...headers, ...extra } });
}
export function createPreviewFetch(delegate) {
  return async (request, env, ctx) => {
    const url = new URL(request.url);
    if (!env.CITYWALK_PREVIEW_ORIGIN || url.origin !== env.CITYWALK_PREVIEW_ORIGIN ||
        !/^citywalk-preview-395-7b99bf8\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)) {
      return reply('Preview host rejected', 421);
    }
    if (!env.CITYWALK_PREVIEW_PASSWORD || env.CITYWALK_PREVIEW_PASSWORD.length < 32) {
      return reply('Preview access is not configured', 503);
    }
    if (request.headers.get('Authorization') !== `Basic ${btoa(`founder:${env.CITYWALK_PREVIEW_PASSWORD}`)}`) {
      return reply('Restricted preview', 401, { 'WWW-Authenticate': 'Basic realm="CITYWALK synthetic preview", charset="UTF-8"' });
    }
    if (!safeRuntimeEnvironment(env)) return reply('Unsafe preview environment rejected', 503);
    const pathname = url.pathname;
    const readMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const actionOrOverride = ['next-action', 'x-rsc-action', 'x-http-method-override', 'x-method-override'].some(key => request.headers.has(key));
    if (!readMethod || actionOrOverride || !isReviewedReadPath(pathname)) {
      return reply(request.method === 'HEAD' ? null : JSON.stringify({ error: 'PREVIEW_ROUTE_OR_METHOD_DISABLED' }), 503, { 'Content-Type': 'application/json' });
    }
    // OPTIONS is answered locally, with no handler, database or CORS permission.
    if (request.method === 'OPTIONS') return reply(null, 204, { Allow: 'GET, HEAD, OPTIONS' });
    if (pathname === '/robots.txt') return reply(request.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n', 200, { 'Content-Type': 'text/plain' });
    if (pathname === '/sitemap.xml') return reply(request.method === 'HEAD' ? null : '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', 200, { 'Content-Type': 'application/xml' });
    let db;
    try { db = new URL(env.HYPERDRIVE.connectionString); } catch { return reply('Synthetic database unavailable', 503); }
    if (!['postgres:', 'postgresql:'].includes(db.protocol) || !env.CITYWALK_PREVIEW_DB_HOST || !env.CITYWALK_PREVIEW_DB_NAME ||
        db.hostname !== env.CITYWALK_PREVIEW_DB_HOST || db.pathname.slice(1) !== env.CITYWALK_PREVIEW_DB_NAME || db.search !== '' || db.hash !== '') {
      return reply('Synthetic database target rejected', 503);
    }
    // The application receives session cookies and original URL/method/RSC/cache
    // headers, but never the preview Basic credential or its environment binding.
    const applicationHeaders = new Headers(request.headers);
    applicationHeaders.delete('Authorization');
    applicationHeaders.delete('Proxy-Authorization');
    const applicationRequest = new Request(request, { headers: applicationHeaders });
    const applicationEnvironment = { ...env };
    delete applicationEnvironment.CITYWALK_PREVIEW_PASSWORD;
    const response = await delegate(applicationRequest, applicationEnvironment, ctx);
    // Never let an application callback/fallback send the browser to production/providers.
    const location = response.headers.get('Location');
    if (location && new URL(location, url).origin !== url.origin) return reply('External preview redirect disabled', 503);
    const result = new Response(request.method === 'HEAD' ? null : response.body, response);
    for (const [key, value] of Object.entries(headers)) result.headers.set(key, value);
    return result;
  };
}
