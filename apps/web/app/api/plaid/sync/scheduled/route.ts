import { SyncTrigger } from "@prisma/client";
import { NextResponse } from "next/server";
import { env } from "../../../../../lib/env";
import { syncDuePlaidItems } from "../../../../../lib/plaid-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (env.SYNC_JOB_SECRET) {
    const secret = request.headers.get("x-sync-job-secret");
    if (secret !== env.SYNC_JOB_SECRET) {
      return NextResponse.json({ error: "Unauthorized scheduled sync request." }, { status: 401 });
    }
  }

  try {
    const syncedCount = await syncDuePlaidItems(SyncTrigger.SCHEDULED, 15);
    return NextResponse.json({ syncedCount });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Scheduled sync failed."
      },
      { status: 500 }
    );
  }
}
