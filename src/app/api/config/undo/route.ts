import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import path from "path";
import { readConfigSafe } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkCsrf } from "@/lib/csrf";

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const CONFIG_REL = path.relative(process.cwd(), path.join(DATA_DIR, "settings.yaml")) || "data/settings.yaml";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // In development, skip git operations to prevent HMR crashes
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json({ error: "Undo not available in development mode", success: false });
  }

  try {
    const stdout = execFileSync("git", ["log", "--oneline", "-2", "--", CONFIG_REL], {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ error: "No previous commit to undo" }, { status: 400 });
    }
    const prevHash = lines[1].split(" ")[0];

    execFileSync("git", ["checkout", prevHash, "--", CONFIG_REL], {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    execFileSync("git", ["add", CONFIG_REL], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    execFileSync("git", ["commit", "-m", "undo: revert last change"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    return NextResponse.json({ success: true, config: readConfigSafe() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Undo failed" },
      { status: 500 }
    );
  }
}
