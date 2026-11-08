// File-only loopback server. No application, auth, database, API or cloud runtime.
import { createServer } from 'node:http';
import { readFileSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const base = path.dirname(fileURLToPath(import.meta.url));
export const files = ['index.html', 'styles.css', 'robots.txt', '_headers', ...[320,390,768,1440].map(width => `screenshots/landing-${width}.png`)];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const headers = Object.fromEntries(readFileSync(path.join(base, 'dist/_headers'), 'utf8').split('\n').filter(line => line.startsWith('  ')).map(line => {
  const [key, ...value] = line.trim().split(': ');
  return [key, value.join(': ')];
}));
export async function startServer(port = 3950) {
  const server = createServer((request, response) => {
    for (const [key, value] of Object.entries(headers)) response.setHeader(key, value);
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    let pathname;
    try { pathname = new URL(request.url, 'http://127.0.0.1').pathname; } catch { response.writeHead(400); response.end(); return; }
    const name = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!files.includes(name)) { response.writeHead(404); response.end(); return; }
    const target = path.join(base, 'dist', name);
    if (!lstatSync(target).isFile() || lstatSync(target).isSymbolicLink()) { response.writeHead(404); response.end(); return; }
    const bytes = readFileSync(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(name)] || 'text/plain; charset=utf-8', 'Content-Length': bytes.length });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || 3950);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Use a local port between 1 and 65535');
  await startServer(port);
  console.log(`Local static visual gallery: http://127.0.0.1:${port}/\nCtrl+C stops it. No app/backend/cloud resources are used.`);
}
