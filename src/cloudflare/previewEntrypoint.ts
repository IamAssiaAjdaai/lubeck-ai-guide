import { authorizePreview } from "./previewPolicy";

type Delegate = (request: Request, env: Record<string, unknown>, ctx: unknown) => Promise<Response>;

export function createPreviewWorker(delegate: Delegate) {
  return {
    async fetch(request: Request, env: Record<string, unknown>, ctx: unknown): Promise<Response> {
      const failure = await authorizePreview(request, env);
      const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" };
      if (failure) return new Response("Preview unavailable.", { status: failure, headers });
      const applicationHeaders = new Headers(request.headers);
      applicationHeaders.delete("x-citywalk-preview-token");
      const response = await delegate(new Request(request, { headers: applicationHeaders }), env, ctx);
      const responseHeaders = new Headers(response.headers);
      for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
    },
  };
}

// Do not import the database, auth SDKs or application until the guard passes.
// No scheduled/queue/email handler is exported by this target.
export default createPreviewWorker(async (request, env, ctx) => {
  const application = (await import("./entrypoint")).default;
  return application.fetch(
    request,
    env as Parameters<typeof application.fetch>[1],
    ctx as Parameters<typeof application.fetch>[2],
  );
});
