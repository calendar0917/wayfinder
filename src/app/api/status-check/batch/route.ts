import { NextRequest, NextResponse } from "next/server";
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

  try {
    const { urls } = await request.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls array required" }, { status: 400 });
    }

    const maxConcurrent = 5;
    const results: Record<string, { status: string; responseTime?: number; statusCode?: number }> = {};
    let running = 0;
    let index = 0;

    await new Promise<void>((resolve) => {
      function processNext() {
        while (running < maxConcurrent && index < urls.length) {
          const url = urls[index++];
          running++;
          const start = Date.now();
          probeUrl(url, start).then((result) => {
            results[url] = result;
            running--;
            if (index >= urls.length && running === 0) {
              resolve();
            } else {
              processNext();
            }
          });
        }
        if (index >= urls.length && running === 0) {
          resolve();
        }
      }
      processNext();
    });

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Batch status check failed" },
      { status: 500 }
    );
  }
}

async function probeUrl(url: string, start: number) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { status: "error", responseTime: Date.now() - start };
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { status: "error", responseTime: Date.now() - start };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(parsedUrl.toString(), {
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
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 5000);
    try {
      const response = await fetch(parsedUrl.toString(), {
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
      };
    }
  }
}
