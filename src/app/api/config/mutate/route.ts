import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig, readConfigSafe } from "@/lib/config";
import { executeTool } from "@/lib/ai-tools";
import { isAuthenticated, hashPassword, setAuthCookie } from "@/lib/auth";
import { gitCommit } from "@/lib/git";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const config = readConfig();
    if (!(await isAuthenticated(config.settings.passwordHash))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { operation, arguments: args } = await request.json();
    if (!operation) {
      return NextResponse.json(
        { error: "Operation name required" },
        { status: 400 }
      );
    }
    const result = executeTool(operation, args || {}, config);

    if (result.success) {
      // Hash password if set_password was called
      if (
        operation === "set_password" &&
        result.config.settings.passwordHash.startsWith("HASH:")
      ) {
        const plain = result.config.settings.passwordHash.slice(5);
        result.config.settings.passwordHash = await hashPassword(plain);
        // Auto-login after setting password so the user doesn't lock themselves out
        await setAuthCookie();
      }
      writeConfig(result.config);
      gitCommit(`edit: ${operation}`);
    }
    return NextResponse.json({
      success: result.success,
      result: result.result,
      config: readConfigSafe(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mutation failed" },
      { status: 500 }
    );
  }
}
