import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";

export async function GET() {
  try {
    const env = await getEnv();
    await env.DB.prepare("SELECT 1 AS ok").first();
    return NextResponse.json({ ok: true, service: "great-lakes-toteops", environment: env.APP_ENV });
  } catch {
    return NextResponse.json({ ok: false, service: "great-lakes-toteops", error: "database_unavailable" }, { status: 503 });
  }
}
