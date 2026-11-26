import { NextResponse } from "next/server";
import { syncAll } from "@/server/sync";

export const dynamic = "force-dynamic";

/**
 * Daily background sync (vercel.json → crons). Vercel sends
 * `Authorization: Bearer $CRON_SECRET` when the CRON_SECRET env var is set.
 * Keeps the solve list complete even on days you don't open the app.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAll();
  return NextResponse.json(result);
}
