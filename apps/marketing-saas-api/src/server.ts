import { createServer, type IncomingMessage } from "node:http";
import { Pool } from "pg";
import { z } from "zod";
import { fromNodeHeaders } from "better-auth/node";
import { configuration, liveDeadlineValid } from "./config";
import { createSaasAuth } from "./auth";
import { ProjectStore, type Principal } from "./store";
import { ApiError } from "./errors";
import { createWebsiteImporter } from "./intake/ingest.server";
import {
  WebsiteIntakeError,
  intakeErrorMessages,
} from "./intake/errors";
import { demoWebsite } from "./demo-website";
import { PdfIntake, PDF_MAX_BYTES } from './intake/pdf';
import { PackService } from "./packs";
import { WorkspacePackService } from "./workspace-packs";
import { WorkspaceService } from "./workspace";
import { CalendarService, calendarRoute } from "./calendar.server";
import { rawBusinessBriefSchema } from "@marketing/core";

import { CreativeService } from "./creative/service";
import { PrivateMedia } from "./creative/storage";
import { creativeRoute } from "./creative/routes";
import { createOpenAIHttpProvider } from "./creative/openai-http";

const serverStartedAt = Date.now();
const id = z.uuid();
const briefCommand = z.strictObject({
  expectedRevision: z.number().int().min(0),
  brief: rawBusinessBriefSchema,
});
const confirmation = z.strictObject({
  expectedRevision: z.number().int().positive(),
  factIds: z.array(z.string().min(1).max(128)).min(1).max(100),
  acknowledged: z.literal(true),
});
const importCommand = z.strictObject({
  expectedRevision: z.number().int().min(0),
  websiteUrl: z.string().max(2048),
  businessName: z.string().min(1).max(160),
  selectedPages: z.array(z.string().max(2048)).max(2).optional(),
});
export function createApi(
  pool: Pool,
  config: ReturnType<typeof configuration>,
  auth = createSaasAuth(pool, config),
) {
  const store = new ProjectStore(pool);
  const creative = config.creative
    ? new CreativeService(
        pool,
        new PrivateMedia(config.mediaDirectory),
        undefined,
        {
          global: config.realImage.enabled
            ? { attempts: 1, concurrent: 1, budget: 100000 }
            : config.creativeGlobal,
          provider: config.realImage.enabled
            ? createOpenAIHttpProvider({
                enabled: () => config.realImage.enabled,
                killSwitch: () =>
                  process.env.MARKETING_CREATIVE_KILL_SWITCH !== "false",
                spendApproved: () =>
                  config.realImage.spendApproved &&
                  liveDeadlineValid(
                    config.realImage.authorizedUntil,
                    serverStartedAt,
                  ),
                priceBoundVerified: () => config.realImage.priceBoundVerified,
                // Lazy and server-only; never accessed by default/offline runner.
                secret: () => process.env.MARKETING_IMAGE_OPENAI_API_KEY,
              })
            : undefined,
          killSwitch: () =>
            process.env.MARKETING_CREATIVE_KILL_SWITCH !== "false",
        },
      )
    : null;
  const packs = config.workspace ? new WorkspacePackService(pool,config.demo) : new PackService(pool,config.demo);
  const workspace = new WorkspaceService(pool, creative);
  const calendar = new CalendarService(pool, workspace);
  const importer = createWebsiteImporter();
  const demoImporter = createWebsiteImporter(demoWebsite);
  const pdfIntake = new PdfIntake();
  async function principal(headers: Headers): Promise<Principal> {
    const session = await auth.api.getSession({ headers });
    if (!session?.user.emailVerified)
      throw new ApiError(401, "SIGN_IN_REQUIRED");
    return { id: session.user.id };
  }
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    try {
      if (
        request.method !== "GET" &&
        request.headers.get("origin") !== config.origin
      )
        throw new ApiError(403, "INVALID_ORIGIN");
      if (path === "/api/auth/sign-up/email" && !config.localRegistration)
        throw new ApiError(403, "REGISTRATION_CLOSED");
      if (path.startsWith("/api/auth/")) return await auth.handler(request);
      if (path === "/api/health")
        return Response.json({
          status: "ok",
          localOnly: true,
          demo: config.demo,
          localRegistration: config.localRegistration,
          emailDelivery: "local_file_sink",
        });
      const actor = await principal(request.headers);
      const documentRoute = /^\/api\/projects\/([^/]+)\/documents\/(preview|accept)$/.exec(path);
      if (documentRoute) {
        const projectId = id.parse(documentRoute[1]);
        if (request.method !== 'POST') throw new ApiError(405,'METHOD_NOT_ALLOWED');
        const project = await store.authorize(pool, actor, projectId, true);
        if (documentRoute[2] === 'preview') {
          const revision = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).parse(request.headers.get('x-context-revision'));
          if (revision !== project.revision) throw new ApiError(409,'STALE_REVISION');
          const label = z.string().min(1).max(1000).transform(v=>decodeURIComponent(v)).pipe(z.string().min(1).max(160)).parse(request.headers.get('x-document-label'));
          if (Number(request.headers.get('content-length')) > PDF_MAX_BYTES) throw new ApiError(413,'PDF_SIZE_LIMIT');
          return Response.json(await pdfIntake.preview(actor.id,projectId,revision,Buffer.from(await request.arrayBuffer()),request.headers.get('content-type')??'',label),{headers:{'Cache-Control':'no-store'}});
        }
        const command = z.strictObject({token:z.uuid(),expectedRevision:z.number().int().min(0),candidateIds:z.array(z.string().max(128)).min(1).max(24),acknowledged:z.literal(true)}).parse(await request.json());
        const preview = pdfIntake.selected(actor.id,projectId,command.token,command.candidateIds);
        const result = await store.appendDocument(actor,projectId,command.expectedRevision,preview);
        pdfIntake.consume(command.token);
        return Response.json(result);
      }
      const creativeResponse = await creativeRoute(request, actor, creative);
      if (creativeResponse) return creativeResponse;
      if (config.workspace) {
        const calendarResponse = await calendarRoute(request, actor, calendar);
        if (calendarResponse) return calendarResponse;
      }
      if (path === "/api/projects") {
        if (request.method === "GET")
          return Response.json(await store.list(actor));
        if (request.method === "POST")
          return Response.json(
            await store.create(
              actor,
              z
                .strictObject({ name: z.string().trim().min(1).max(160) })
                .parse(await request.json()).name,
            ),
            { status: 201 },
          );
      }
      const ux=/^\/api\/projects\/([^/]+)\/workspace(?:\/(readiness|draft|reviews|export|rebind))?(?:\/([^/]+))?$/.exec(path);
      if(ux){
        if(!config.workspace)throw new ApiError(404,"WORKSPACE_OFFLINE_ONLY");
        const pid=id.parse(ux[1]); await store.authorize(pool,actor,pid,request.method!=="GET" && ux[2]!=="export");
        const gid=ux[3]?id.parse(ux[3]):null;
        if(ux[2]==="readiness"&&request.method==="GET")return Response.json(await workspace.readiness(actor,pid));
        if(ux[2]==="draft"&&["GET","POST"].includes(request.method))return Response.json(await workspace.draft(actor,pid,request.method==="POST"?await request.json():undefined));
        if(ux[2]==="reviews"&&gid){
          if(request.method==="GET")return Response.json(await workspace.reviews(actor,pid,gid,z.coerce.number().int().positive().parse(new URL(request.url).searchParams.get("version"))));
          if(request.method==="POST")return Response.json(await workspace.review(actor,pid,gid,await request.json()));
        }
        if(ux[2]==="rebind"&&gid&&request.method==="POST"){
          if(!creative)throw new ApiError(404,"CREATIVE_QA_DISABLED");
          return Response.json(await creative.rebindForWorkspace(actor,pid,gid,await request.json()));
        }
        if(ux[2]==="export"&&gid&&request.method==="POST")return Response.json(await workspace.export(actor,pid,gid,await request.json()));
        throw new ApiError(405,"METHOD_NOT_ALLOWED");
      }
      const packRoute =
        /^\/api\/projects\/([^/]+)\/(usage|packs)(?:\/([^/]+))?(?:\/(edit|export))?$/.exec(
          path,
        );
      if (packRoute) {
        const projectId = id.parse(packRoute[1]);
        await store.authorize(
          pool,
          actor,
          projectId,
          request.method !== "GET" && packRoute[4] !== "export",
        );
        if (packRoute[2] === "usage" && request.method === "GET")
          return Response.json(await packs.usage(actor, projectId));
        if (packRoute[2] === "packs") {
          const generationId = packRoute[3] ? id.parse(packRoute[3]) : null;
          if (request.method === "GET") {
            if(generationId)return Response.json(await packs.read(actor,projectId,generationId));
            const items=await packs.list(actor,projectId);
            if(!config.workspace)return Response.json(items);
            const current=await store.read(actor,projectId);
            return Response.json(await Promise.all(items.map(async item=>{
              let label=item.status==='completed'?'Prüfung ausstehend':item.status==='failed'?'Aktualisierung erforderlich':'Entwurf';
              if(item.status==='completed'){
                if(item.context_revision!==current.revision)label='Aktualisierung erforderlich';
                else {const r=await workspace.reviews(actor,projectId,item.id,item.output_revision);if(r.every(x=>x.approved))label='Bereit zum Download';else if(r.some(x=>x.textApproved&&!x.approved))label='Aktualisierung erforderlich';}
              }
              return {...item,statusLabel:label};
            })));
          }
          if (request.method === "POST" && !generationId)
            return Response.json(
              await packs.generate(actor, projectId, await request.json()),
            );
          if (
            request.method === "POST" &&
            generationId &&
            packRoute[4] === "edit"
          )
            return Response.json(
              await packs.edit(
                actor,
                projectId,
                generationId,
                await request.json(),
              ),
            );
          if (
            request.method === "POST" &&
            generationId &&
            packRoute[4] === "export"
          ) {
            const command = z
              .strictObject({
                expectedVersion: z.number().int().positive(),
                reviewed: z.literal(true),
              })
              .parse(await request.json());
            if(config.workspace){
              const validated=await workspace.export(actor,projectId,generationId,{expectedVersion:command.expectedVersion,scope:"texts"});
              return Response.json({markdown:validated.files.filter(f=>f.name.endsWith("beitrag.md")).map(f=>Buffer.from(f.base64,"base64").toString("utf8")).join("\n\n")});
            }
            return Response.json(
              await packs.export(
                actor,
                projectId,
                generationId,
                command.expectedVersion,
              ),
            );
          }
        }
        throw new ApiError(405, "METHOD_NOT_ALLOWED");
      }
      const match =
        /^\/api\/projects\/([^/]+)(?:\/(brief|confirm|import))?$/.exec(path);
      if (!match) throw new ApiError(404, "NOT_FOUND");
      const projectId = id.parse(match[1]);
      if (request.method === "GET" && !match[2])
        return Response.json(await store.read(actor, projectId));
      if (request.method !== "POST")
        throw new ApiError(405, "METHOD_NOT_ALLOWED");
      // Authorize before body-sensitive work, import/network or quota/provider access.
      await store.authorize(pool, actor, projectId, true);
      if (match[2] === "brief") {
        const command = briefCommand.parse(await request.json());
        // Browser briefs are declarations; a submitted locator is not ingestion evidence.
        const manual = {
          ...command.brief,
          provenance: [],
          hypotheses: [],
          facts: command.brief.facts.map((f) => ({
            ...f,
            basis: "user_supplied" as const,
            provenanceIds: [],
          })),
        };
        return Response.json(
          await store.revise(
            actor,
            projectId,
            command.expectedRevision,
            manual,
          ),
        );
      }
      if (match[2] === "confirm") {
        const command = confirmation.parse(await request.json());
        return Response.json(
          await store.confirm(
            actor,
            projectId,
            command.expectedRevision,
            command.factIds,
          ),
        );
      }
      if (match[2] === "import") {
        const { expectedRevision, ...input } = importCommand.parse(
          await request.json(),
        );
        const useDemo =
          config.demo && /^https:\/\/glanz\.example\/?$/.test(input.websiteUrl);
        const result = await (useDemo ? demoImporter : importer)(input);
        return Response.json(
          await store.revise(
            actor,
            projectId,
            expectedRevision,
            result.brief,
            result.evidence,
          ),
        );
      }
      throw new ApiError(404, "NOT_FOUND");
    } catch (error) {
      if (error instanceof WebsiteIntakeError)
        return Response.json(
          {
            error: error.code,
            message: intakeErrorMessages[error.code],
            manualFallback: true,
          },
          { status: error.status },
        );
      if (error instanceof z.ZodError)
        return Response.json(
          { error: "INVALID_INPUT", message: "Bitte die Eingaben prüfen." },
          { status: 400 },
        );
      if (error instanceof ApiError)
        return Response.json({ error: error.code }, { status: error.status });
      // Never echo request text, credentials, SQL or provider bodies.
      return Response.json({ error: "REQUEST_FAILED" }, { status: 500 });
    }
  };
}
async function body(req: IncomingMessage, creative = false) {
  const limit =
    req.method === 'POST' && /^\/api\/projects\/[a-f0-9-]+\/documents\/preview$/.test((req.url??'').split('?')[0]) ? PDF_MAX_BYTES :
    creative &&
    req.method === "POST" &&
    /^\/api\/projects\/[a-f0-9-]+\/creative\/assets$/.test(
      (req.url ?? "").split("?")[0],
    )
      ? 3 * 1024 * 1024
      : 131072;
  const parts: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw new ApiError(413, "BODY_TOO_LARGE");
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}
export function startServer(
  pool: Pool,
  config: ReturnType<typeof configuration>,
) {
  const api = createApi(pool, config);
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
      const headers = fromNodeHeaders(req.headers);
      // Ignore browser/proxy-asserted identity headers; bind rate limiting to socket.
      headers.set(
        "x-marketing-client-ip",
        req.socket.remoteAddress ?? "127.0.0.1",
      );
      const data = await body(req, config.creative);
      const request = new Request(new URL(req.url ?? "/", config.origin), {
        method: req.method,
        headers,
        ...(data.length ? { body: data } : {}),
      });
      const response = await api(request);
      res.statusCode = response.status;
      for (const [key, value] of response.headers)
        if (key !== "set-cookie") res.setHeader(key, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader("set-cookie", cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = error instanceof ApiError ? error.status : 400;
      res.end(
        JSON.stringify({
          error: error instanceof ApiError ? error.code : "INVALID_REQUEST",
        }),
      );
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server.listen(config.port, "127.0.0.1", () =>
    console.log(`MARKETING_API_READY 127.0.0.1:${config.port}`),
  );
}
if (process.argv[1]?.endsWith("/server.ts")) {
  const config = configuration();
  startServer(
    new Pool({ connectionString: config.databaseUrl, max: 10 }),
    config,
  );
}
