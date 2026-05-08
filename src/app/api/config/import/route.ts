import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig, readConfigSafe } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth";
import { gitCommit } from "@/lib/git";
import type { Group, Bookmark } from "@/types/config";

interface ImportBookmark {
  name?: string;
  title?: string;
  url?: string;
  href?: string;
  icon?: string;
  description?: string;
  tags?: string[];
}

interface ImportGroup {
  name?: string;
  title?: string;
  bookmarks?: ImportBookmark[];
  groups?: ImportGroup[];
}

function normalizeImportBookmark(b: ImportBookmark): Bookmark {
  return {
    name: b.name || b.title || "Untitled",
    url: b.url || b.href || "",
    icon: b.icon || "",
    description: b.description || "",
    shortcut: "",
    tags: b.tags || [],
    server: "",
    container: "",
  };
}

function normalizeImportGroups(groups: ImportGroup[]): Group[] {
  return groups.map((g) => ({
    name: g.name || g.title || "Untitled",
    icon: "",
    collapsed: false,
    bookmarks: (g.bookmarks || []).map(normalizeImportBookmark),
    groups: g.groups ? normalizeImportGroups(g.groups) : [],
  }));
}

export async function POST(request: NextRequest) {
  try {
    const config = readConfig();
    if (!(await isAuthenticated(config.settings.passwordHash))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const mode = (body.mode as string) || "merge"; // "merge" or "replace"
    const importGroups: ImportGroup[] = body.groups || [];

    const normalized = normalizeImportGroups(importGroups);

    if (mode === "replace") {
      config.groups = normalized;
    } else {
      // Merge: add new groups, skip groups with same name
      for (const group of normalized) {
        const existing = config.groups.find((g) => g.name === group.name);
        if (existing) {
          // Merge bookmarks into existing group
          for (const bookmark of group.bookmarks) {
            const dup = existing.bookmarks.find(
              (b) => b.url.toLowerCase().replace(/\/+$/, "") === bookmark.url.toLowerCase().replace(/\/+$/, "")
            );
            if (!dup) {
              existing.bookmarks.push(bookmark);
            }
          }
        } else {
          config.groups.push(group);
        }
      }
    }

    writeConfig(config);
    gitCommit("import: bookmarks imported");

    return NextResponse.json({
      success: true,
      result: `Imported ${normalized.reduce((acc, g) => acc + g.bookmarks.length, 0)} bookmarks`,
      config: readConfigSafe(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
