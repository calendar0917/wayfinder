import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth";

const DEFAULT_PASSWORD_HASH = "$2a$12$VwhkwP7xdXX0rhIY5l58.OoRGNVQPUlHAM6uBBCaIH0MX9zwbkq.G";

export async function GET() {
  const config = readConfig();
  const authRequired = !!config.settings.passwordHash;
  const authenticated = await isAuthenticated(config.settings.passwordHash);
  const isDefaultPassword = config.settings.passwordHash === DEFAULT_PASSWORD_HASH;
  return NextResponse.json({
    authRequired,
    authenticated,
    isDefaultPassword,
  });
}
