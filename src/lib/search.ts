export function buildSearchUrl(engine: string, query: string, customUrl: string = ""): string {
  const encoded = encodeURIComponent(query);
  if (engine === "custom" && customUrl) {
    return customUrl.replace("{query}", encoded);
  }
  const engines: Record<string, string> = {
    google: `https://www.google.com/search?q=${encoded}`,
    duckduckgo: `https://duckduckgo.com/?q=${encoded}`,
    bing: `https://www.bing.com/search?q=${encoded}`,
  };
  return engines[engine] ?? `https://duckduckgo.com/?q=${encoded}`;
}

export function getEngineName(engine: string): string {
  const names: Record<string, string> = {
    google: "Google",
    duckduckgo: "DuckDuckGo",
    bing: "Bing",
  };
  if (engine === "custom") return "Custom";
  return names[engine] ?? engine;
}
