import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { readConfigSafe, writeConfig, readConfig } from "@/lib/config";
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
    const stdout = execFileSync("git", ["log", "--oneline", "-2", "--", "data/settings.yaml"], {
      cwd: process.cwd(),
      encoding: "utf-8",
    });
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ error: "No previous commit to undo" }, { status: 400 });
    }
    const prevHash = lines[1].split(" ")[0];

    execFileSync("git", ["checkout", prevHash, "--", "data/settings.yaml"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    execFileSync("git", ["add", "data/settings.yaml"], {
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
