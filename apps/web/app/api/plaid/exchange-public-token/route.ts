import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "../../../../lib/auth";
import { hasPlaidCredentials } from "../../../../lib/env";
import { exchangePublicTokenAndSync } from "../../../../lib/plaid-sync";

export const runtime = "nodejs";

const bodySchema = z.object({
  publicToken: z.string().min(1)
});

export async function POST(request: Request) {
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
    const body = await request.json();
    const parsedBody = bodySchema.parse(body);
    const item = await exchangePublicTokenAndSync(userId, parsedBody.publicToken);
    return NextResponse.json({
      itemId: item.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
