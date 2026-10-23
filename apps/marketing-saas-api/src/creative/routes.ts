import { z } from "zod";
import { CreativeService } from "./service";
import type { Principal } from "../store";
import { ApiError } from "../errors";

export async function creativeRoute(
  request: Request,
  actor: Principal,
  service: CreativeService | null,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path === "/api/creative-capabilities" && request.method === "GET")
    return Response.json({
      enabled: !!service,
      provider: service?.imageProvider ?? "mock",
      videoControl: false,
    });
  const m =
    /^\/api\/projects\/([^/]+)\/creative(?:\/(kit|assets|jobs|brief|erasure))?(?:\/([^/]+))?(?:\/(metadata|approve|delete|process|review|attach|output|export|cancel))?$/.exec(
      path,
    );
  if (!m) return null;
  if (!service) throw new ApiError(404, "CREATIVE_QA_DISABLED");
  const pid = z.uuid().parse(m[1]),
    resource = m[2],
    key = m[3] ? z.uuid().parse(m[3]) : null,
    action = m[4];
  // Authorization precedes body parsing and image decoding, including disabled/malformed requests.
  await service.store.authorize(
    service.pool,
    actor,
    pid,
    request.method !== "GET",
  );
  if (request.method === "GET") {
    if (!resource) return Response.json(await service.read(actor, pid));
    if (resource === "assets" && key && !action) {
      const r = await service.assetBytes(actor, pid, key);
      return new Response(new Uint8Array(r.bytes), {
        headers: { "Content-Type": r.mime, "Cache-Control": "no-store" },
      });
    }
    if (resource === "jobs" && key && action === "output") {
      const r = await service.output(actor, pid, key);
      return new Response(new Uint8Array(r.bytes), {
        headers: { "Content-Type": r.mime, "Cache-Control": "no-store" },
      });
    }
  }
  if (request.method === "POST") {
    if (resource === "brief" && !key)
      return Response.json(
        await service.previewBrief(actor, pid, await request.json()),
      );
    if (resource === "erasure" && !key)
      return Response.json(
        await service.eraseCreative(actor, pid, await request.json()),
      );
    if (resource === "kit" && !key)
      return Response.json(
        await service.saveKit(actor, pid, await request.json()),
      );
    if (resource === "assets" && !key)
      return Response.json(
        await service.upload(
          actor,
          pid,
          Buffer.from(await request.arrayBuffer()),
          request.headers.get("content-type") ?? "",
        ),
        { status: 201 },
      );
    if (resource === "assets" && key) {
      if (action === "metadata")
        return Response.json(
          await service.metadata(actor, pid, key, await request.json()),
        );
      if (action === "approve")
        return Response.json(
          await service.approveAsset(actor, pid, key, await request.json()),
        );
      if (action === "delete")
        return Response.json(
          await service.deleteAsset(actor, pid, key, await request.json()),
        );
    }
    // Image-only admission. Video interface is internal QA; there is deliberately no public job submit route for it.
    if (resource === "jobs" && !key) {
      const j = await service.enqueue(
        actor,
        pid,
        "image",
        await request.json(),
      );
      return Response.json({ id: j.id, state: j.state });
    }
    if (resource === "jobs" && key) {
      if (action === "process") {
        await service.processImage(actor, pid, key);
        const current = (await service.read(actor, pid)).jobs.find(
          (j) => j.id === key,
        );
        return Response.json({
          processed: true,
          state: current?.state ?? "unavailable",
          error: current?.error,
        });
      }
      if (action === "review")
        return Response.json(
          await service.review(actor, pid, key, await request.json()),
        );
      if (action === "attach")
        return Response.json(await service.attach(actor, pid, key));
      if (action === "cancel")
        return Response.json(await service.cancel(actor, pid, key));
      if (action === "export") {
        z.strictObject({ reviewed: z.literal(true) }).parse(
          await request.json(),
        );
        const r = await service.output(actor, pid, key, true);
        return Response.json({
          filename: `DEMO-creative-${key}.png`,
          mime: r.mime,
          base64: r.bytes.toString("base64"),
          metadata: r.metadata,
        });
      }
    }
  }
  throw new ApiError(405, "METHOD_NOT_ALLOWED");
}
