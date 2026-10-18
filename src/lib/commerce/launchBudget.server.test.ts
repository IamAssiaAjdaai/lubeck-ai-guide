import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
const consume = vi.hoisted(()=>vi.fn());
vi.mock("@/lib/databaseRateLimit.server",()=>({consumeDatabaseRateLimit:consume}));
import { reserveLaunchAiCall } from "./launchBudget.server";
afterEach(()=>{vi.unstubAllEnvs();vi.resetAllMocks();});
it("leaves disabled policy unchanged",async()=>{await reserveLaunchAiCall();expect(consume).not.toHaveBeenCalled();});
it("uses one shared database cap across visitors and retries",async()=>{
 vi.stubEnv("CITYWALK_LAUNCH_FREE_ENABLED","1");vi.stubEnv("CITYWALK_LAUNCH_AI_CALLS_PER_24H","10");consume.mockResolvedValue({success:true});
 await reserveLaunchAiCall();await reserveLaunchAiCall();expect(consume).toHaveBeenCalledTimes(2);
 expect(consume).toHaveBeenCalledWith({scope:"citywalk-launch-provider-calls-v1",identifier:"global",maxRequests:10,windowMs:86400000});
 consume.mockResolvedValue({success:false});await expect(reserveLaunchAiCall()).rejects.toThrow("EXHAUSTED");
 consume.mockRejectedValue(new Error("database unavailable"));await expect(reserveLaunchAiCall()).rejects.toThrow("database unavailable");
});
it.each(["", "0", "-1", "1001", "NaN"])("fails closed for invalid cap %s",async cap=>{
 vi.stubEnv("CITYWALK_LAUNCH_FREE_ENABLED","1");vi.stubEnv("CITYWALK_LAUNCH_AI_CALLS_PER_24H",cap);
 await expect(reserveLaunchAiCall()).rejects.toThrow("UNAVAILABLE");expect(consume).not.toHaveBeenCalled();
});
