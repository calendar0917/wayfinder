import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig, readConfigSafe, withWriteLock } from "@/lib/config";
import { executeTool } from "@/lib/ai-tools";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { gitCommit } from "@/lib/git";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (!checkCsrf(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { operation, arguments: args } = await request.json();
    if (!operation) {
      return NextResponse.json(
        { error: "Operation name required" },
        { status: 400 }
      );
    }

    return await withWriteLock(async () => {
      const config = readConfig();
      const result = executeTool(operation, args || {}, config);

      if (result.success) {
        if (
          operation === "set_password" &&
          result.config.settings.passwordHash.startsWith("HASH:")
        ) {
          const plain = result.config.settings.passwordHash.slice(5);
          result.config.settings.passwordHash = await hashPassword(plain);
          await setAuthCookie();
        }
        if (operation !== "reload_config") {
          writeConfig(result.config);
          gitCommit(`edit: ${operation}`);
        }
      }
      return NextResponse.json({
        success: result.success,
        result: result.result,
        config: readConfigSafe(),
      });
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mutation failed" },
      { status: 500 }
    );
  }
}
