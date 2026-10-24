// Local preparation only: deny outbound TCP/TLS/fetch, allow local IPC used by
// the build toolchain. No application endpoint or database is contacted.
import net from "node:net";
import tls from "node:tls";
import { syncBuiltinESMExports } from "node:module";
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = args[0];
  const ipc = typeof first === 'string' && !/^\d+$/.test(first) ||
    typeof first === 'object' && typeof first?.path === 'string';
  if (!ipc) throw new Error('PREVIEW_PREPARATION_NETWORK_DENIED');
  return original.apply(this, args);
};
tls.connect = () => { throw new Error('PREVIEW_PREPARATION_TLS_DENIED'); };
global.fetch = () => { throw new Error('PREVIEW_PREPARATION_FETCH_DENIED'); };
syncBuiltinESMExports();
