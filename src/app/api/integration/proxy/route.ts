import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { resolveEnvVar } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkCsrf } from "@/lib/csrf";
import type { Group, Bookmark } from "@/types/config";

function findBookmarkInGroups(
  groups: Group[],
  name: string,
  groupName?: string
): Bookmark | null {
  for (const g of groups) {
    if (!groupName || g.name === groupName) {
      const found = g.bookmarks?.find((b) => b.name === name);
      if (found) return found;
    }
    if (g.groups) {
      const found = findBookmarkInGroups(g.groups, name, groupName);
      if (found) return found;
    }
  }
  return null;
}

function resolveHeaders(headers: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    resolved[key] = (resolveEnvVar(value) as string) || value;
  }
  return resolved;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = readConfig();
  if (!(await isAuthenticated(config.settings.passwordHash))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bookmarkName, groupName } = await request.json();
    if (!bookmarkName || typeof bookmarkName !== "string") {
      return NextResponse.json({ error: "bookmarkName required" }, { status: 400 });
    }

    const bookmark = findBookmarkInGroups(config.groups, bookmarkName, groupName);
    if (!bookmark) {
      return NextResponse.json({ error: `Bookmark '${bookmarkName}' not found` }, { status: 404 });
    }
    if (!bookmark.integration) {
      return NextResponse.json({ error: "Bookmark has no integration" }, { status: 400 });
    }

    const { endpoint, headers } = bookmark.integration;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(endpoint);
    } catch {
      return NextResponse.json({ error: "Invalid endpoint URL" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only HTTP(S) endpoints allowed" }, { status: 400 });
    }

    const resolvedHeaders = headers ? resolveHeaders(headers) : {};

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "HomepageDashboard/1.0 IntegrationProxy",
          "Accept": "application/json",
          ...resolvedHeaders,
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Upstream returned ${response.status}`, statusCode: response.status },
          { status: 502 }
        );
      }

      const data = await response.json();
      return NextResponse.json({ data });
    } catch (fetchError) {
      clearTimeout(timeout);
      return NextResponse.json(
        {
          error: fetchError instanceof Error ? fetchError.message : "Upstream request failed",
        },
        { status: 502 }
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Integration proxy failed" },
      { status: 500 }
    );
  }
}
