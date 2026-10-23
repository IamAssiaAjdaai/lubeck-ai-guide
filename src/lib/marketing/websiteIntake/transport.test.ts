// @vitest-environment node
import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("node:https", () => ({ request }));
import { pinnedHttpsNetwork } from "./network.server";
it("pins actual socket lookup without changing TLS hostname or sending auth/cookies", async () => {
  request.mockImplementation((_url, options, callback) => {
    expect(options.servername).toBe("glanz.example");
    expect(options.rejectUnauthorized).toBe(true);
    expect(options.agent).toBe(false);
    expect(options.family).toBe(4);
    expect(options.headers.Cookie).toBeUndefined(); expect(options.headers.Authorization).toBeUndefined();
    const lookupCallback=vi.fn();options.lookup("glanz.example",{},lookupCallback);
    expect(lookupCallback).toHaveBeenCalledWith(null,"93.184.216.34",4);
    const req = new EventEmitter() as EventEmitter & {end:()=>void};
    req.end = () => {const res=Object.assign(new EventEmitter(),{statusCode:200,headers:{"content-type":"text/html"}});callback(res);res.emit("data",Buffer.from("<p>Synthetic service</p>"));res.emit("end");};
    return req;
  });
  const response = await pinnedHttpsNetwork.get(new URL("https://glanz.example"),{address:"93.184.216.34",family:4},new AbortController().signal,262144);
  expect(response.status).toBe(200);
});
