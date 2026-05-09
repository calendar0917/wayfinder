import jsYaml from "js-yaml";

interface ImportGroup {
  name: string;
  bookmarks: Array<{ name: string; url: string; icon?: string; description?: string; tags?: string[] }>;
}

export function normalizeHomepageConfig(yaml: string): ImportGroup[] {
  const parsed = jsYaml.load(yaml) as Record<string, unknown>;
  const services = parsed?.services;
  if (!services || typeof services !== "object") return [];

  const groups: ImportGroup[] = [];
  for (const [groupName, items] of Object.entries(services as Record<string, unknown>)) {
    if (!Array.isArray(items)) continue;
    const bookmarks = items
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        name: String(item.name || item.title || ""),
        url: String(item.url || item.href || ""),
        icon: item.icon ? String(item.icon) : undefined,
        description: item.description ? String(item.description) : undefined,
      }))
      .filter((b) => b.name && b.url);

    if (bookmarks.length > 0) {
      groups.push({ name: groupName, bookmarks });
    }
  }
  return groups;
}

export function normalizeDashyConfig(yaml: string): ImportGroup[] {
  const parsed = jsYaml.load(yaml) as Record<string, unknown>;
  const sections = parsed?.sections;
  if (!Array.isArray(sections)) return [];

  const groups: ImportGroup[] = [];
  for (const section of sections) {
    if (typeof section !== "object" || section === null) continue;
    const sec = section as Record<string, unknown>;
    const name = String(sec.name || "Untitled");
    const items = sec.items;
    if (!Array.isArray(items)) continue;

    const bookmarks = items
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        name: String(item.title || item.name || ""),
        url: String(item.url || item.href || ""),
        icon: item.icon ? String(item.icon) : undefined,
        description: item.description ? String(item.description) : undefined,
        tags: Array.isArray(item.tags)
          ? item.tags.map((t: unknown) => String(t))
          : undefined,
      }))
      .filter((b) => b.name && b.url);

    if (bookmarks.length > 0) {
      groups.push({ name, bookmarks });
    }
  }
  return groups;
}
