export function resolvePath(obj: unknown, path: string): unknown {
  // Split on dots, but also handle bracket notation like [0]
  // e.g. "items[0].name" → ["items", "0", "name"]
  const tokens: string[] = [];
  for (const segment of path.split(".")) {
    // Extract the base key and any bracket indices
    const match = segment.match(/^([^\[]*)(\[.*\])?$/);
    if (!match) continue;
    if (match[1]) tokens.push(match[1]);
    if (match[2]) {
      for (const idx of match[2].matchAll(/\[(\d+)\]/g)) {
        tokens.push(idx[1]);
      }
    }
  }

  let current: unknown = obj;
  for (const token of tokens) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(token, 10);
      if (isNaN(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }
  return current;
}
