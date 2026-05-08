import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is required. " +
      "Generate one with: openssl rand -hex 32"
    );
  }
  return secret;
}

function signToken(value: string): string {
  const secret = getSigningSecret();
  const hmac = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verifyToken(token: string): boolean {
  const sep = token.lastIndexOf(".");
  if (sep === -1) return false;
  const value = token.slice(0, sep);
  const sig = token.slice(sep + 1);
  const expected = crypto
    .createHmac("sha256", getSigningSecret())
    .update(value)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = signToken("authenticated");
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(
  passwordHash: string
): Promise<boolean> {
  if (!passwordHash) return true; // no password set = auth disabled
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}
