import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { probeUrlsConcurrently } from "@/lib/probe";
import type { Group } from "@/types/config";

function collectStatusCheckUrls(groups: Group[]): string[] {
  const urls: string[] = [];
  function walk(groups: Group[]) {
    for (const g of groups) {
      for (const b of g.bookmarks) {
        if (b.statusCheck && b.url) urls.push(b.url);
      }
      if (g.groups) walk(g.groups);
    }
  }
  walk(groups);
  return [...new Set(urls)];
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const config = readConfig();
    const urls = collectStatusCheckUrls(config.groups);
    if (urls.length === 0) {
      return NextResponse.json({});
    }

    const results = await probeUrlsConcurrently(urls);
    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status check failed" },
      { status: 500 }
    );
  }
}
