import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { verifyPassword, setAuthCookie } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password required" },
        { status: 400 }
      );
    }
    const config = readConfig();
    if (!config.settings.passwordHash) {
      return NextResponse.json(
        { success: false, error: "No password configured" },
        { status: 400 }
      );
    }
    const valid = await verifyPassword(password, config.settings.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }
    await setAuthCookie();
    return NextResponse.json({ success: true, redirect: "/" });
  } catch {
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
