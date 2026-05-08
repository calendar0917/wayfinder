import { describe, it, expect } from "vitest";
import crypto from "crypto";

const SECRET = "test-secret-key-for-testing";

function signToken(value: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verifyToken(token: string, secret: string): boolean {
  const sep = token.lastIndexOf(".");
  if (sep === -1) return false;
  const value = token.slice(0, sep);
  const sig = token.slice(sep + 1);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex");
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

describe("auth token signing", () => {
  it("should sign and verify a token round-trip", () => {
    const token = signToken("authenticated", SECRET);
    expect(verifyToken(token, SECRET)).toBe(true);
  });

  it("should reject a tampered token", () => {
    const token = signToken("authenticated", SECRET);
    const tampered = token.replace("authenticated", "admin");
    expect(verifyToken(tampered, SECRET)).toBe(false);
  });

  it("should reject a token with wrong secret", () => {
    const token = signToken("authenticated", SECRET);
    expect(verifyToken(token, "wrong-secret")).toBe(false);
  });

  it("should reject a token with no separator", () => {
    expect(verifyToken("justastring", SECRET)).toBe(false);
  });

  it("should reject an empty token", () => {
    expect(verifyToken("", SECRET)).toBe(false);
  });
});
