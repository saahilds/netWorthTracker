import { SyncTrigger } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/db";
import { syncPlaidItem } from "../../../../lib/plaid-sync";

export const runtime = "nodejs";

const webhookBodySchema = z.object({
  item_id: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsedBody = webhookBodySchema.parse(rawBody);
    if (!parsedBody.item_id) {
      return NextResponse.json({ ok: true });
    }

    const item = await prisma.plaidItem.findUnique({
      where: {
        plaidItemId: parsedBody.item_id
      },
      select: {
        id: true
      }
    });
    if (!item) {
      return NextResponse.json({ ok: true });
    }

    await syncPlaidItem(item.id, SyncTrigger.WEBHOOK);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed."
      },
      { status: 500 }
    );
  }
}
