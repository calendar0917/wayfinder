import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkCsrf } from "@/lib/csrf";

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
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only HTTP(S) URLs allowed" }, { status: 400 });
    }

    const start = Date.now();
    const result = await probeUrl(parsedUrl.toString(), start);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Status check failed" },
      { status: 500 }
    );
  }
}

async function probeUrl(url: string, start: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "HomepageDashboard/1.0 StatusCheck" },
    });
    clearTimeout(timeout);
    return {
      status: response.ok ? "up" : "down",
      responseTime: Date.now() - start,
      statusCode: response.status,
    };
  } catch (headError) {
    clearTimeout(timeout);
    // Fallback to GET — some servers reject HEAD
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 5000);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller2.signal,
        redirect: "follow",
        headers: { "User-Agent": "HomepageDashboard/1.0 StatusCheck" },
      });
      clearTimeout(timeout2);
      return {
        status: response.ok ? "up" : "down",
        responseTime: Date.now() - start,
        statusCode: response.status,
      };
    } catch {
      clearTimeout(timeout2);
      return {
        status: "error",
        responseTime: Date.now() - start,
        statusCode: 0,
        error: headError instanceof Error ? headError.message : "Request failed",
      };
    }
  }
}
