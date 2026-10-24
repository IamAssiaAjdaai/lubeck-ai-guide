// Offline, single-tester utility. Never run in CI; do not commit generated keys or tokens.
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { readFile, writeFile, open, chmod } from "node:fs/promises";
import { resolve } from "node:path";
import { exportJWK, importPKCS8, SignJWT } from "jose";

const [mode, ...args] = process.argv.slice(2);
const usage = "Usage: init <absolute-private-key-path> | token <absolute-private-key-path> <issuer-https-url> <client-id> <tester-subject>";
function keyPath(raw) {
  if (!raw || !raw.startsWith("/") || raw.includes("\n")) throw Error("Use an absolute private-key path outside the repository");
  const p = resolve(raw);
  if (p.includes("/lubeck-ai-guide/") || p.includes("/.git/")) throw Error("Private key must be outside the project");
  return p;
}
function issuerUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw Error("Invalid HTTPS issuer");
  return url.href;
}
if (mode === "init" && args.length === 1) {
  const path = keyPath(args[0]);
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  // Exclusive create prevents accidental replacement of an existing key.
  const fd = await open(path, "wx", 0o600);
  try { await fd.writeFile(pem); } finally { await fd.close(); }
  await chmod(path, 0o600);
  const jwk = await exportJWK(publicKey);
  const kid = "citywalk-preview-local-1";
  console.log(JSON.stringify({ keys: [{ ...jwk, kid, use: "sig", alg: "RS256" }] }));
} else if (mode === "token" && args.length === 4) {
  const [keyArg, issuer, clientId, subject] = args;
  const key = keyPath(keyArg);
  if (!clientId || !subject || clientId.length > 128 || subject.length > 128) throw Error("Invalid tester client/subject");
  const pem = await readFile(key, "utf8");
  const privateKey = await importPKCS8(pem, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    client_id: clientId, scope: "citywalk:preview:read",
  }).setProtectedHeader({ alg: "RS256", typ: "at+jwt", kid: "citywalk-preview-local-1" })
    .setIssuer(issuerUrl(issuer)).setAudience("https://api-preview.getcitywalk.com")
    .setSubject(subject).setIssuedAt(now).setExpirationTime(now + 300)
    .setJti(randomUUID()).sign(privateKey);
  // Sensitive output: use only in a private terminal; never paste into chats/logs.
  process.stdout.write(jwt + "\n");
} else {
  console.error(usage);
  process.exitCode = 2;
}
