import { headers } from "next/headers";

import {
  GuestIdentityConflictError,
  linkGuestIdentityToUser,
  parseGuestLinkInput,
} from "@/lib/account/guestLink.server";
import { auth } from "@/lib/auth/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = parseGuestLinkInput(body);
  if (!input) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const status = await linkGuestIdentityToUser(session.user.id, input);
    return Response.json({ status });
  } catch (error) {
    if (error instanceof GuestIdentityConflictError) {
      return Response.json(
        { error: "Guest identity is linked to another account." },
        { status: 409 },
      );
    }

    return Response.json(
      { error: "Account data is temporarily unavailable." },
      { status: 503 },
    );
  }
}
