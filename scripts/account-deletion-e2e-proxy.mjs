import fs from "node:fs";
import http from "node:http";
import https from "node:https";

const certPath = process.env.CITYWALK_ACCOUNT_E2E_TLS_CERT;
const keyPath = process.env.CITYWALK_ACCOUNT_E2E_TLS_KEY;
const target = new URL(process.env.CITYWALK_ACCOUNT_E2E_PROXY_TARGET ?? "http://127.0.0.1:3101");
const port = Number(process.env.CITYWALK_ACCOUNT_E2E_PROXY_PORT ?? "3443");

if (!certPath || !keyPath || !Number.isInteger(port) || port <= 0) {
  throw new Error("Account deletion E2E TLS proxy configuration is incomplete");
}

const server = https.createServer(
  {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  },
  (request, response) => {
    const upstream = http.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        method: request.method,
        path: request.url,
        headers: {
          ...request.headers,
          host: request.headers.host,
          "x-forwarded-proto": "https",
          "x-forwarded-host": request.headers.host,
        },
      },
      upstreamResponse => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );

    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });

    request.pipe(upstream);
  },
);

server.listen(port, "127.0.0.1", () => {
  console.log(`[account-e2e] TLS proxy listening on https://127.0.0.1:${port}`);
});
