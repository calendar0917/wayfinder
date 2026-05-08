import { NextRequest, NextResponse } from "next/server";

async function verifySignedToken(token: string): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const sep = token.lastIndexOf(".");
  if (sep === -1) return false;
  const value = token.slice(0, sep);
  const sig = token.slice(sep + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedSig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const sigBuf = new TextEncoder().encode(sig);
  const expBuf = new TextEncoder().encode(expectedHex);
  if (sigBuf.length !== expBuf.length) return false;
  let diff = 0;
  for (let i = 0; i < sigBuf.length; i++) {
    diff |= sigBuf[i] ^ expBuf[i];
  }
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect write/AI endpoints — the dashboard is publicly viewable
  const protectedPaths = [
    "/api/ai/",
    "/api/config/mutate",
    "/api/config/undo",
    "/api/config/import",
    "/api/git",
    "/api/status-check",
    "/api/docker/status",
  ];
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));
  // Also protect /api/config for non-GET methods (PUT)
  const isConfigWrite = pathname === "/api/config" && request.method !== "GET";
  if (!isProtectedPath && !isConfigWrite) return NextResponse.next();

  const token = request.cookies.get("auth_token")?.value;
  if (token && (await verifySignedToken(token))) return NextResponse.next();

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: ["/api/:path*"],
};
