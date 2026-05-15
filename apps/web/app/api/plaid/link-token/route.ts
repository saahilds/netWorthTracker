import { NextResponse } from "next/server";
import { getAuthSession } from "../../../../lib/auth";
import { hasPlaidCredentials } from "../../../../lib/env";
import { createPlaidLinkTokenForUser } from "../../../../lib/plaid-sync";

export const runtime = "nodejs";

export async function POST() {
  const session = await getAuthSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPlaidCredentials()) {
    return NextResponse.json(
      {
        error: "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET."
      },
      { status: 400 }
    );
  }

  try {
    const linkToken = await createPlaidLinkTokenForUser(userId);
    return NextResponse.json({ linkToken });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create link token."
      },
      { status: 500 }
    );
  }
}
