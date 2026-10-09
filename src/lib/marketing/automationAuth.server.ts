import "server-only";

const HEADER_NAME = "x-citywalk-automation-key";

export function requireAutomationAuth(request: Request) {
  const expected = process.env.CITYWALK_AUTOMATION_SECRET;

  if (!expected) {
    throw new Error("CITYWALK_AUTOMATION_SECRET is not configured.");
  }

  const provided = request.headers.get(HEADER_NAME);

  if (!provided || provided !== expected) {
    return false;
  }

  return true;
}