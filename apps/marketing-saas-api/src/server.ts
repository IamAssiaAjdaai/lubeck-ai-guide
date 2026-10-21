import { createServer, type IncomingMessage } from "node:http";
import { Pool } from "pg";
import { z } from "zod";
import { fromNodeHeaders } from "better-auth/node";
import { configuration } from "./config";
import { createSaasAuth } from "./auth";
import { ProjectStore, type Principal } from "./store";
import { ApiError } from "./errors";
import { createWebsiteImporter } from "../../../src/lib/marketing/websiteIntake/ingest.server";
import { WebsiteIntakeError, intakeErrorMessages } from "../../../src/lib/marketing/websiteIntake/errors";
import { rawBusinessBriefSchema } from "@marketing/core";

const id = z.uuid();
const briefCommand = z.strictObject({ expectedRevision:z.number().int().min(0), brief:rawBusinessBriefSchema });
const confirmation = z.strictObject({ expectedRevision:z.number().int().positive(),factIds:z.array(z.string().min(1).max(128)).min(1).max(100),acknowledged:z.literal(true) });
const importCommand = z.strictObject({expectedRevision:z.number().int().min(0),websiteUrl:z.string().max(2048),businessName:z.string().min(1).max(160),selectedPages:z.array(z.string().max(2048)).max(2).optional()});
export function createApi(pool: Pool, config: ReturnType<typeof configuration>, auth = createSaasAuth(pool,config)) {
  const store = new ProjectStore(pool);
  const importer = createWebsiteImporter();
  async function principal(headers: Headers): Promise<Principal> {
    const session = await auth.api.getSession({headers});
    if (!session?.user.emailVerified) throw new ApiError(401,"SIGN_IN_REQUIRED");
    return {id:session.user.id};
  }
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    try {
      if (request.method !== "GET" && request.headers.get("origin") !== config.origin) throw new ApiError(403,"INVALID_ORIGIN");
      if (path.startsWith("/api/auth/")) return await auth.handler(request);
      if(path === "/api/health") return Response.json({status:"ok",localOnly:true,demo:config.demo,emailDelivery:"local_file_sink"});
      const actor = await principal(request.headers);
      if (path === "/api/projects") {
        if (request.method === "GET") return Response.json(await store.list(actor));
        if (request.method === "POST") return Response.json(await store.create(actor,z.strictObject({name:z.string().trim().min(1).max(160)}).parse(await request.json()).name),{status:201});
      }
      const match = /^\/api\/projects\/([^/]+)(?:\/(brief|confirm|import))?$/.exec(path);
      if (!match) throw new ApiError(404,"NOT_FOUND");
      const projectId = id.parse(match[1]);
      if (request.method === "GET" && !match[2]) return Response.json(await store.read(actor,projectId));
      if (request.method !== "POST") throw new ApiError(405,"METHOD_NOT_ALLOWED");
      // Authorize before body-sensitive work, import/network or quota/provider access.
      await store.authorize(pool,actor,projectId,true);
      if(match[2] === "brief") {
        const command=briefCommand.parse(await request.json());
        // Browser briefs are declarations; a submitted locator is not ingestion evidence.
        const manual={...command.brief,provenance:[],hypotheses:[],facts:command.brief.facts.map(f=>({...f,basis:"user_supplied" as const,provenanceIds:[]}))};
        return Response.json(await store.revise(actor,projectId,command.expectedRevision,manual));
      }
      if(match[2] === "confirm") {
        const command=confirmation.parse(await request.json());
        return Response.json(await store.confirm(actor,projectId,command.expectedRevision,command.factIds));
      }
      if(match[2] === "import") {
        const {expectedRevision,...input}=importCommand.parse(await request.json());
        const result=await importer(input);
        return Response.json(await store.revise(actor,projectId,expectedRevision,result.brief,result.evidence));
      }
      throw new ApiError(404,"NOT_FOUND");
    } catch(error) {
      if(error instanceof WebsiteIntakeError) return Response.json({error:error.code,message:intakeErrorMessages[error.code],manualFallback:true},{status:error.status});
      if(error instanceof z.ZodError) return Response.json({error:"INVALID_INPUT",message:"Bitte die Eingaben prüfen."},{status:400});
      if(error instanceof ApiError) return Response.json({error:error.code},{status:error.status});
      // Never echo request text, credentials, SQL or provider bodies.
      return Response.json({error:"REQUEST_FAILED"},{status:500});
    }
  };
}
async function body(req: IncomingMessage) {
  const parts: Buffer[]=[];let bytes=0;
  for await(const chunk of req){ bytes+=chunk.length;if(bytes>131072)throw new ApiError(413,"BODY_TOO_LARGE");parts.push(chunk); }
  return Buffer.concat(parts);
}
export function startServer(pool: Pool, config: ReturnType<typeof configuration>) {
  const api=createApi(pool,config);
  const server=createServer(async(req,res)=>{
    res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","no-referrer");
    try {
      const headers=fromNodeHeaders(req.headers);
      // Ignore browser/proxy-asserted identity headers; bind rate limiting to socket.
      headers.set("x-marketing-client-ip",req.socket.remoteAddress ?? "127.0.0.1");
      const data=await body(req);
      const request=new Request(new URL(req.url??"/",config.origin),{method:req.method,headers,...(data.length?{body:data}: {})});
      const response=await api(request);
      res.statusCode=response.status;
      for(const [key,value] of response.headers) if(key!=="set-cookie")res.setHeader(key,value);
      const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader("set-cookie",cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.statusCode=error instanceof ApiError?error.status:400;res.end(JSON.stringify({error:error instanceof ApiError?error.code:"INVALID_REQUEST"}));}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  return server.listen(config.port,"127.0.0.1",()=>console.log(`MARKETING_API_READY 127.0.0.1:${config.port}`));
}
if(process.argv[1]?.endsWith("/server.ts")) {const config=configuration();startServer(new Pool({connectionString:config.databaseUrl,max:10}),config);}
