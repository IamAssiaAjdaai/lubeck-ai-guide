import { syncBuiltinESMExports } from "node:module";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import dgram from "node:dgram";
import child from "node:child_process";
import workers from "node:worker_threads";
const marker = Symbol.for("marketing.offline.guard");
export function installOfflineGuard() {
  if (globalThis[marker]) return globalThis[marker];
  const state = { blocked: 0, mode: "deny-all-network-and-child-execution" };
  function deny() {
    state.blocked++;
    throw new Error("OFFLINE_NETWORK_OR_PROCESS_BLOCKED");
  }
  globalThis.fetch = async () => deny();
  if ("WebSocket" in globalThis)
    globalThis.WebSocket = class {
      constructor() {
        deny();
      }
    };
  for (const transport of [http, https]) {
    transport.request = deny;
    transport.get = deny;
  }
  net.connect = deny;
  net.createConnection = deny;
  net.Socket.prototype.connect = deny;
  tls.connect = deny;
  for (const key of ["lookup", "resolve", "resolve4", "resolve6", "reverse"]) {
    dns[key] = deny;
    dns.promises[key] = async () => deny();
  }
  dgram.createSocket = deny;
  for (const key of [
    "spawn",
    "spawnSync",
    "exec",
    "execSync",
    "execFile",
    "execFileSync",
    "fork",
  ])
    child[key] = deny;
  workers.Worker = class {
    constructor() {
      deny();
    }
  };
  syncBuiltinESMExports();
  globalThis[marker] = state;
  return state;
}
export function offlineGuardState() {
  return globalThis[marker];
}
