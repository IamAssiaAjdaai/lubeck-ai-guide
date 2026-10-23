// Canonical local runner. Existing services only; no credential provisioning or remote setup.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const mode=process.argv[2];
if(!["start","migrate","verify"].includes(mode))throw Error("Use start, migrate or verify");
if(!process.env.MARKETING_DATABASE_URL||!process.env.MARKETING_AUTH_SECRET)throw Error("Supply isolated local MARKETING_DATABASE_URL and MARKETING_AUTH_SECRET outside Git");
const origin=process.env.MARKETING_ORIGIN??"http://127.0.0.1:3208";
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error("LOCAL_ORIGIN_REQUIRED");
const env={...process.env,MARKETING_ORIGIN:origin,MARKETING_API_PORT:process.env.MARKETING_API_PORT??"3209",MARKETING_DEMO_MODE:"true",MARKETING_WORKSPACE_UX_ENABLED:"true",MARKETING_CREATIVE_QA_ENABLED:"true",MARKETING_AI_ENABLED:"false",MARKETING_REAL_IMAGE_TRANSPORT_ENABLED:"false",MARKETING_REAL_IMAGE_SPEND_APPROVED:"false",MARKETING_REAL_IMAGE_PRICE_BOUND_VERIFIED:"false",MARKETING_REAL_IMAGE_AUTHORIZED_UNTIL:"",MARKETING_CREATIVE_KILL_SWITCH:"false"};
for(const key of Object.keys(env))if(/API_KEY|OPENAI|BYTEPLUS|SEEDANCE/.test(key))delete env[key];
env.MARKETING_API_ORIGIN=`http://127.0.0.1:${env.MARKETING_API_PORT}`;
const children=[];
function run(args){const child=spawn(process.execPath,["--import",root+"scripts/marketing-creative-offline-guard.mjs",...args],{cwd:root,env,stdio:"inherit"});children.push(child);child.on("exit",code=>{for(const other of children)if(other!==child)other.kill("SIGTERM");process.exitCode=code??1;});}
if(mode==="start"){
 run(["--conditions=react-server","--import","tsx","apps/marketing-saas-api/src/server.ts"]);
 run(["node_modules/vite/bin/vite.js","--config","apps/marketing-saas/vite.config.ts","--port",new URL(origin).port]);
}else run(["--conditions=react-server","--import","tsx",`apps/marketing-saas-api/src/${mode}.ts`]);
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>{for(const child of children)child.kill(signal);});
