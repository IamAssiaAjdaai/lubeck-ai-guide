// Reviewed route list. Unknown handlers never run, regardless of HTTP method.
const pages = new Set(['/', '/privacy', '/terms', '/imprint', '/support', '/account-deletion']);
const links = new Set(['/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']);
const assets = new Set([
  '/brand/citywalk-mark.svg',
  '/images/city-hamburg.webp', '/images/citywalk-hero.png',
  '/images/city-duesseldorf.webp', '/images/citywalk-waterfront.webp',
  '/landmarks/holstentor.jpg', '/landmarks/heiligen-geist-hospital.jpg',
  '/landmarks/rathaus.jpg', '/landmarks/marienkirche.jpg', '/landmarks/buddenbrookhaus.jpg',
]);
const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
const content = new RegExp(`^/api/content/cities(?:/${slug}(?:/summary|/places/${slug})?)?$`);
const open = new RegExp(`^/open/${slug}/${slug}$`);
// Only emitted JS/CSS/font assets, never /_next/image, source maps or manifests.
const compiledAsset = /^\/_next\/static\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:js|css|woff2?|ttf|otf)$/;
export function isReviewedReadPath(pathname) {
  if (pathname.includes('%') || pathname.split('/').some(segment => segment === '.' || segment === '..')) return false;
  return pages.has(pathname) || links.has(pathname) || assets.has(pathname) ||
    pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/api/health' ||
    pathname === '/api/content/image' || content.test(pathname) || open.test(pathname) || compiledAsset.test(pathname);
}
