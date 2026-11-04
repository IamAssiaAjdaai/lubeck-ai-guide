// Preloaded only for offline type generation/TypeScript, never a deploy artifact.
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';
const blocked = () => { throw new Error('PREVIEW_OFFLINE_VERIFICATION_NETWORK_DISABLED'); };
globalThis.fetch = blocked;
net.Socket.prototype.connect = blocked;
tls.connect = blocked;
for (const transport of [http, https]) {
  transport.request = blocked;
  transport.get = blocked;
}
dns.lookup = blocked;
dns.promises.lookup = blocked;
syncBuiltinESMExports();
