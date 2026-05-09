import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeTool } from "../ai-tools";
import { configSchema, DEFAULT_CONFIG } from "../config-schema";
import type { AppConfig } from "@/types/config";

function makeConfig(): AppConfig {
  return configSchema.parse({
    ...DEFAULT_CONFIG,
    settings: { ...DEFAULT_CONFIG.settings, passwordHash: "" },
    groups: [
      {
        name: "Test Group",
        icon: "",
        collapsed: false,
        bookmarks: [
          { name: "GitHub", url: "https://github.com", icon: "", description: "", shortcut: "", tags: [], server: "", container: "" },
          { name: "Google", url: "https://google.com", icon: "", description: "Search engine", shortcut: "", tags: ["search"], server: "", container: "" },
        ],
        groups: [],
      },
    ],
  });
}

describe("add_bookmark", () => {
  let config: AppConfig;

  beforeEach(() => {
    config = makeConfig();
  });

  it("adds a bookmark to the first group by default", () => {
    const result = executeTool("add_bookmark", { name: "Test", url: "https://test.com" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks).toHaveLength(3);
  });

  it("rejects javascript: URLs", () => {
    const result = executeTool("add_bookmark", { name: "Evil", url: "javascript:alert(1)" }, config);
    expect(result.success).toBe(false);
    expect(result.result).toContain("javascript:");
  });

  it("adds a bookmark to a specific group", () => {
    const result = executeTool("add_bookmark", { name: "Test", url: "https://test.com", group: "Test Group" }, config);
    expect(result.success).toBe(true);
  });

  it("fails for non-existent group", () => {
    const result = executeTool("add_bookmark", { name: "Test", url: "https://test.com", group: "Missing" }, config);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate URLs", () => {
    const result = executeTool("add_bookmark", { name: "GitHub2", url: "https://github.com", group: "Test Group" }, config);
    expect(result.success).toBe(false);
    expect(result.result).toContain("Duplicate URL");
  });

  it("allows bookmark with different URL", () => {
    const result = executeTool("add_bookmark", { name: "GitHub2", url: "https://github.com/other", group: "Test Group" }, config);
    expect(result.success).toBe(true);
  });
});

describe("remove_bookmark", () => {
  it("removes a bookmark by name", () => {
    const config = makeConfig();
    const result = executeTool("remove_bookmark", { name: "GitHub" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks).toHaveLength(1);
    expect(result.config.groups[0].bookmarks[0].name).toBe("Google");
  });

  it("fails for non-existent bookmark", () => {
    const result = executeTool("remove_bookmark", { name: "Missing" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("update_bookmark", () => {
  it("updates bookmark fields", () => {
    const config = makeConfig();
    const result = executeTool("update_bookmark", { name: "GitHub", url: "https://github.com/new" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[0].url).toBe("https://github.com/new");
  });

  it("allows clearing a field with empty string", () => {
    const config = makeConfig();
    const result = executeTool("update_bookmark", { name: "Google", description: "" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[1].description).toBe("");
  });

  it("fails when no updatable fields provided", () => {
    const result = executeTool("update_bookmark", { name: "GitHub" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("move_bookmark", () => {
  it("moves bookmark between groups", () => {
    const config = makeConfig();
    config.groups.push({ name: "Target Group", icon: "", collapsed: false, bookmarks: [], groups: [] });
    const result = executeTool("move_bookmark", { name: "GitHub", fromGroup: "Test Group", toGroup: "Target Group" }, config);
    expect(result.success).toBe(true);
    expect(config.groups[0].bookmarks).toHaveLength(1);
    expect(config.groups[1].bookmarks).toHaveLength(1);
  });
});

describe("add_group", () => {
  it("creates a new top-level group", () => {
    const result = executeTool("add_group", { name: "New Group" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.groups).toHaveLength(2);
  });

  it("creates a nested group", () => {
    const result = executeTool("add_group", { name: "Nested", parentGroup: "Test Group" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.groups[0].groups).toHaveLength(1);
  });
});

describe("remove_group", () => {
  it("removes a group", () => {
    const result = executeTool("remove_group", { name: "Test Group" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.groups).toHaveLength(0);
  });
});

describe("change_layout", () => {
  it("changes column count", () => {
    const result = executeTool("change_layout", { columns: 5 }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.layout.columns).toBe(5);
  });

  it("clamps columns between 1 and 8", () => {
    const result = executeTool("change_layout", { columns: 20 }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.layout.columns).toBe(8);
  });
});

describe("change_theme", () => {
  it("changes theme", () => {
    const result = executeTool("change_theme", { theme: "dark" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.theme).toBe("dark");
  });
});

describe("update_locale", () => {
  it("changes locale", () => {
    const result = executeTool("update_locale", { locale: "zh" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.locale).toBe("zh");
  });

  it("rejects empty locale", () => {
    const result = executeTool("update_locale", { locale: "" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("search_bookmarks", () => {
  it("finds bookmarks by name", () => {
    const result = executeTool("search_bookmarks", { query: "GitHub" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("GitHub");
  });

  it("finds bookmarks by tag", () => {
    const result = executeTool("search_bookmarks", { query: "search" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("Google");
  });

  it("returns no results for unmatched query", () => {
    const result = executeTool("search_bookmarks", { query: "zzzzz" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("No bookmarks found");
  });
});

describe("unknown tool", () => {
  it("returns error for unknown tool name", () => {
    const result = executeTool("nonexistent", {}, makeConfig());
    expect(result.success).toBe(false);
    expect(result.result).toContain("Unknown tool");
  });
});

describe("add_widget", () => {
  it("adds a widget by type", () => {
    const result = executeTool("add_widget", { type: "notes", config: {} }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.widgets).toContainEqual({ type: "notes", config: {} });
  });
});

describe("remove_widget", () => {
  it("removes by index", () => {
    const config = makeConfig();
    const initialLength = config.widgets.length;
    const result = executeTool("remove_widget", { index: 0 }, config);
    expect(result.success).toBe(true);
    expect(result.config.widgets).toHaveLength(initialLength - 1);
  });

  it("removes by type", () => {
    const config = makeConfig();
    const initialLength = config.widgets.length;
    const result = executeTool("remove_widget", { type: config.widgets[0]?.type }, config);
    expect(result.success).toBe(true);
    expect(result.config.widgets).toHaveLength(initialLength - 1);
  });

  it("fails for invalid index", () => {
    const result = executeTool("remove_widget", { index: 99 }, makeConfig());
    expect(result.success).toBe(false);
  });

  it("fails for non-existent type", () => {
    const config = makeConfig();
    config.widgets = [{ type: "datetime", config: {} }];
    const result = executeTool("remove_widget", { type: "logo" }, config);
    expect(result.success).toBe(false);
  });
});

describe("configure_integration", () => {
  it("configures an integration on a bookmark", () => {
    const config = makeConfig();
    const fields = [{ path: "status", label: "Status" }];
    const result = executeTool("configure_integration", {
      name: "GitHub",
      endpoint: "http://localhost/api/status",
      fields,
      display: "badge",
      pollInterval: 30,
    }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[0].integration).toBeDefined();
    expect(result.config.groups[0].bookmarks[0].integration!.endpoint).toBe("http://localhost/api/status");
    expect(result.config.groups[0].bookmarks[0].integration!.display).toBe("badge");
    expect(result.config.groups[0].bookmarks[0].integration!.pollInterval).toBe(30);
  });

  it("rejects non-http endpoints", () => {
    const result = executeTool("configure_integration", {
      name: "GitHub",
      endpoint: "ftp://localhost/api",
      fields: [{ path: "data" }],
    }, makeConfig());
    expect(result.success).toBe(false);
  });

  it("rejects empty fields", () => {
    const result = executeTool("configure_integration", {
      name: "GitHub",
      endpoint: "http://localhost/api",
      fields: [],
    }, makeConfig());
    expect(result.success).toBe(false);
  });

  it("fails for non-existent bookmark", () => {
    const result = executeTool("configure_integration", {
      name: "Missing",
      endpoint: "http://localhost/api",
      fields: [{ path: "data" }],
    }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("remove_integration", () => {
  it("removes an integration from a bookmark", () => {
    const config = makeConfig();
    executeTool("configure_integration", {
      name: "GitHub",
      endpoint: "http://localhost/api",
      fields: [{ path: "data" }],
    }, config);
    const result = executeTool("remove_integration", { name: "GitHub" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[0].integration).toBeUndefined();
  });

  it("fails when bookmark has no integration", () => {
    const result = executeTool("remove_integration", { name: "GitHub" }, makeConfig());
    expect(result.success).toBe(false);
  });
});
