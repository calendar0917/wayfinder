import { describe, it, expect, beforeEach } from "vitest";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  record.count++;
  return record.count <= MAX_ATTEMPTS;
}

describe("rate limiter", () => {
  beforeEach(() => {
    attempts.clear();
  });

  it("should allow requests under the limit", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(checkRateLimit("1.2.3.4")).toBe(true);
    }
  });

  it("should block requests over the limit", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("1.2.3.4");
    }
    expect(checkRateLimit("1.2.3.4")).toBe(false);
  });

  it("should track IPs independently", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("1.2.3.4");
    }
    expect(checkRateLimit("5.6.7.8")).toBe(true);
  });

  it("should reset after the time window", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit("1.2.3.4");
    }
    // Simulate window expiry
    const record = attempts.get("1.2.3.4")!;
    record.resetAt = Date.now() - 1;
    expect(checkRateLimit("1.2.3.4")).toBe(true);
  });
});
