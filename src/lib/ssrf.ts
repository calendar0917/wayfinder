export function isPrivateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
    if (/^10\./.test(host) || /^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
    if (host === "169.254.169.254") return true;
    if (host.endsWith(".internal") || host.endsWith(".local")) return true;
    return false;
  } catch {
    return false;
  }
}
