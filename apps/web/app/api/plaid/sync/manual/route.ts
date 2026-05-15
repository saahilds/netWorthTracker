import { SyncTrigger } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthSession } from "../../../../../lib/auth";
import { syncAllPlaidItemsForUser } from "../../../../../lib/plaid-sync";

export const runtime = "nodejs";

export async function POST() {
  const session = await getAuthSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncAllPlaidItemsForUser(userId, SyncTrigger.MANUAL);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Manual sync failed." },
      { status: 500 }
    );
  }
}
