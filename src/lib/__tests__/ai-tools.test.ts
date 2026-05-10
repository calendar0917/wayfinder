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

describe("rename_group", () => {
  it("renames a group and updates page references", () => {
    const config = makeConfig();
    config.pages = [{ name: "Home", groups: ["Test Group"] }];
    const result = executeTool("rename_group", { oldName: "Test Group", newName: "Renamed" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].name).toBe("Renamed");
    expect(result.config.pages![0].groups).toContain("Renamed");
    expect(result.config.pages![0].groups).not.toContain("Test Group");
  });

  it("fails for non-existent group", () => {
    const result = executeTool("rename_group", { oldName: "Missing", newName: "New" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("reorder_bookmark", () => {
  it("reorders a bookmark within its group", () => {
    const config = makeConfig();
    const result = executeTool("reorder_bookmark", { group: "Test Group", fromIndex: 0, toIndex: 1 }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[0].name).toBe("Google");
    expect(result.config.groups[0].bookmarks[1].name).toBe("GitHub");
  });

  it("fails for invalid indices", () => {
    const result = executeTool("reorder_bookmark", { group: "Test Group", fromIndex: -1, toIndex: 0 }, makeConfig());
    expect(result.success).toBe(false);
  });

  it("fails for non-existent group", () => {
    const result = executeTool("reorder_bookmark", { group: "Missing", fromIndex: 0, toIndex: 1 }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("move_bookmark with position", () => {
  it("moves bookmark to a specific position", () => {
    const config = makeConfig();
    // Add a third bookmark
    executeTool("add_bookmark", { name: "Third", url: "https://third.com" }, config);
    const result = executeTool("move_bookmark", { name: "GitHub", fromGroup: "Test Group", toGroup: "Test Group", position: 2 }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[2].name).toBe("GitHub");
  });
});

describe("set_password", () => {
  it("sets password with HASH: sentinel", () => {
    const config = makeConfig();
    const result = executeTool("set_password", { password: "mypassword" }, config);
    expect(result.success).toBe(true);
    expect(result.config.settings.passwordHash).toBe("HASH:mypassword");
  });

  it("rejects short passwords", () => {
    const result = executeTool("set_password", { password: "abc" }, makeConfig());
    expect(result.success).toBe(false);
    expect(result.result).toContain("4 characters");
  });

  it("rejects empty password", () => {
    const result = executeTool("set_password", { password: "" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("update_ai_settings", () => {
  it("updates AI model only", () => {
    const config = makeConfig();
    const result = executeTool("update_ai_settings", { aiModel: "gpt-4o-mini" }, config);
    expect(result.success).toBe(true);
    expect(result.config.settings.aiModel).toBe("gpt-4o-mini");
  });

  it("returns no changes when aiModel not provided", () => {
    const result = executeTool("update_ai_settings", {}, makeConfig());
    expect(result.success).toBe(false);
  });

  it("ignores apiKey and apiBase parameters", () => {
    const config = makeConfig();
    const original = config.settings.apiKey;
    const result = executeTool("update_ai_settings", { aiModel: "gpt-4o-mini", apiKey: "sk-hacked", apiBase: "http://evil.com" }, config);
    expect(result.success).toBe(true);
    expect(result.config.settings.apiKey).toBe(original);
    expect(result.config.settings.apiBase).not.toBe("http://evil.com");
  });
});

describe("update_title", () => {
  it("updates the title", () => {
    const result = executeTool("update_title", { title: "New Title" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.title).toBe("New Title");
  });

  it("rejects empty title", () => {
    const result = executeTool("update_title", { title: "  " }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("update_search", () => {
  it("updates search engine", () => {
    const result = executeTool("update_search", { engine: "google" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.search.engine).toBe("google");
  });

  it("rejects invalid engine", () => {
    const result = executeTool("update_search", { engine: "yandex" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("update_custom_css", () => {
  it("updates custom CSS", () => {
    const result = executeTool("update_custom_css", { css: ":root { --accent: red; }" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.customCss).toBe(":root { --accent: red; }");
  });

  it("strips script tags from CSS", () => {
    const result = executeTool("update_custom_css", { css: "<script>alert(1)</script>body { color: red; }" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.settings.customCss).not.toContain("<script>");
  });

  it("rejects empty CSS", () => {
    const result = executeTool("update_custom_css", { css: "" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("add_page", () => {
  it("creates a new page", () => {
    const config = makeConfig();
    const result = executeTool("add_page", { name: "Page 2", groups: ["Test Group"] }, config);
    expect(result.success).toBe(true);
    expect(result.config.pages).toHaveLength(1);
    expect(result.config.pages![0].name).toBe("Page 2");
  });

  it("warns about unknown groups", () => {
    const result = executeTool("add_page", { name: "Page 2", groups: ["NonExistent"] }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("Warning");
    expect(result.result).toContain("NonExistent");
  });

  it("rejects duplicate page names", () => {
    const config = makeConfig();
    executeTool("add_page", { name: "Alpha" }, config);
    const result = executeTool("add_page", { name: "Alpha" }, config);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = executeTool("add_page", { name: "" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("remove_page", () => {
  it("removes a page", () => {
    const config = makeConfig();
    executeTool("add_page", { name: "Page 1" }, config);
    const result = executeTool("remove_page", { name: "Page 1" }, config);
    expect(result.success).toBe(true);
    expect(result.config.pages).toBeUndefined();
  });

  it("fails for non-existent page", () => {
    const config = makeConfig();
    const result = executeTool("remove_page", { name: "Missing" }, config);
    expect(result.success).toBe(false);
  });
});

describe("update_page", () => {
  it("updates page name and groups", () => {
    const config = makeConfig();
    executeTool("add_page", { name: "Old Name", groups: ["Test Group"] }, config);
    const result = executeTool("update_page", { name: "Old Name", newName: "New Name", groups: ["Test Group"] }, config);
    expect(result.success).toBe(true);
    expect(result.config.pages![0].name).toBe("New Name");
  });

  it("fails for non-existent page", () => {
    const result = executeTool("update_page", { name: "Missing", newName: "New" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("add_group with pages", () => {
  it("auto-adds new group to first page", () => {
    const config = makeConfig();
    executeTool("add_page", { name: "Home", groups: ["Test Group"] }, config);
    const result = executeTool("add_group", { name: "New Group" }, config);
    expect(result.success).toBe(true);
    expect(result.config.pages![0].groups).toContain("New Group");
    expect(result.result).toContain("Home");
  });

  it("does not auto-add nested group to page", () => {
    const config = makeConfig();
    executeTool("add_page", { name: "Home", groups: ["Test Group"] }, config);
    const result = executeTool("add_group", { name: "Nested", parentGroup: "Test Group" }, config);
    expect(result.success).toBe(true);
    expect(result.config.pages![0].groups).not.toContain("Nested");
  });
});

describe("list_templates", () => {
  it("returns templates", () => {
    const result = executeTool("list_templates", {}, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("pihole");
  });

  it("filters templates by keyword", () => {
    const result = executeTool("list_templates", { filter: "port" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("portainer");
  });
});

describe("probe_endpoint", () => {
  it("rejects private network addresses", () => {
    const result = executeTool("probe_endpoint", { endpoint: "http://127.0.0.1:8080/api" }, makeConfig());
    expect(result.success).toBe(false);
    expect(result.result).toContain("private");
  });

  it("rejects non-HTTP protocols", () => {
    const result = executeTool("probe_endpoint", { endpoint: "ftp://example.com/api" }, makeConfig());
    expect(result.success).toBe(false);
    expect(result.result).toContain("HTTP");
  });

  it("rejects invalid URLs", () => {
    const result = executeTool("probe_endpoint", { endpoint: "not-a-url" }, makeConfig());
    expect(result.success).toBe(false);
    expect(result.result).toContain("Invalid");
  });

  it("returns probe marker for valid public URLs", () => {
    const result = executeTool("probe_endpoint", { endpoint: "https://api.example.com/status" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("__PROBE__");
  });
});

describe("configure_integration with template", () => {
  it("configures from template", () => {
    const config = makeConfig();
    const result = executeTool("configure_integration", {
      name: "GitHub",
      template: "pihole",
      HOST: "192.168.1.10",
    }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[0].integration).toBeDefined();
    expect(result.config.groups[0].bookmarks[0].integration!.endpoint).toContain("192.168.1.10");
  });

  it("fails for unknown template", () => {
    const result = executeTool("configure_integration", {
      name: "GitHub",
      template: "nonexistent",
    }, makeConfig());
    expect(result.success).toBe(false);
    expect(result.result).toContain("not found");
  });

  it("respects display arg in non-template mode", () => {
    const config = makeConfig();
    const result = executeTool("configure_integration", {
      name: "GitHub",
      endpoint: "http://localhost/api",
      fields: [{ path: "status" }],
      display: "card",
    }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[0].integration!.display).toBe("card");
  });
});

describe("remove_group page cleanup", () => {
  it("removes group references from pages", () => {
    const config = makeConfig();
    config.pages = [{ name: "Home", groups: ["Test Group"] }];
    const result = executeTool("remove_group", { name: "Test Group" }, config);
    expect(result.success).toBe(true);
    expect(result.config.pages![0].groups).toHaveLength(0);
  });
});
