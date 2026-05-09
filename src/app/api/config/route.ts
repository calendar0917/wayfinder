import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readConfigSafe, writeConfig, withWriteLock } from "@/lib/config";
import { configSchema } from "@/lib/config-schema";
import { gitCommit } from "@/lib/git";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkCsrf } from "@/lib/csrf";

export async function GET() {
  const config = readConfigSafe();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (!checkCsrf(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const validated = configSchema.parse(body);
    await withWriteLock(() => { writeConfig(validated); });
    gitCommit("manual: full config update");
    return NextResponse.json(readConfigSafe());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
