// Defense in depth for the explicit local Creative QA runner, including inherited API keys.
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { syncBuiltinESMExports } from "node:module";
function local(host) {
  return ["127.0.0.1", "localhost", "::1"].includes(host);
}
function check(input) {
  if (typeof input === "string" || input instanceof URL) {
    const u = new URL(input);
    if (!local(u.hostname)) throw new Error("CREATIVE_OFFLINE_NETWORK_BLOCKED");
  } else if (input && !local(input.hostname ?? input.host ?? "localhost"))
    throw new Error("CREATIVE_OFFLINE_NETWORK_BLOCKED");
}
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (input, init) => {
  check(input instanceof Request ? input.url : input);
  return fetchOriginal(input, init);
};
for (const transport of [http, https])
  for (const method of ["request", "get"]) {
    const original = transport[method];
    transport[method] = function (input, ...rest) {
      check(input);
      return original.call(this, input, ...rest);
    };
  }
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const a = args[0];
  const host = Array.isArray(a)
    ? a[0]?.host
    : typeof a === "object"
      ? a?.host
      : typeof args[1] === "string"
        ? args[1]
        : undefined;
  if (host && !local(host)) throw new Error("CREATIVE_OFFLINE_NETWORK_BLOCKED");
  return connect.apply(this, args);
};
syncBuiltinESMExports();
