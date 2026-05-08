import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  const config = readConfig();
  const authRequired = !!config.settings.passwordHash;
  const authenticated = await isAuthenticated(config.settings.passwordHash);
  return NextResponse.json({
    authRequired,
    authenticated,
  });
}
