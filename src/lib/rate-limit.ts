const attempts = new Map<string, { count: number; resetAt: number }>();
export const MAX_ATTEMPTS = 30;
export const WINDOW_MS = 60_000;

function evictExpired(): void {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now > record.resetAt) attempts.delete(key);
  }
}

export function checkRateLimit(ip: string): boolean {
  evictExpired();
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  record.count++;
  return record.count <= MAX_ATTEMPTS;
}
