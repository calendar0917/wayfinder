import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  const config = readConfig();
  if (!(await isAuthenticated(config.settings.passwordHash))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Export only bookmarks, no secrets
  const exportData = {
    version: config.version,
    groups: config.groups,
    exportedAt: new Date().toISOString(),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="wayfinder-bookmarks-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
