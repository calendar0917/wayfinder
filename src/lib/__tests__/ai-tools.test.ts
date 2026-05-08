import { describe, it, expect } from "vitest";
import { executeTool } from "../ai-tools";
import type { AppConfig } from "@/types/config";

function makeConfig(): AppConfig {
  return {
    version: 1,
    settings: {
      title: "Test",
      theme: "auto",
      layout: { columns: 4 },
      search: { engine: "duckduckgo", customUrl: "" },
      apiKey: "",
      apiBase: "https://api.openai.com/v1",
      aiModel: "gpt-4o",
      passwordHash: "",
    },
    widgets: [
      { type: "datetime", config: {} },
      { type: "weather", config: {} },
    ],
    groups: [
      {
        name: "Default",
        icon: "",
        collapsed: false,
        bookmarks: [
          { name: "GitHub", url: "https://github.com", icon: "", description: "", shortcut: "", tags: [], server: "", container: "" },
          { name: "Google", url: "https://google.com", icon: "", description: "Search engine", shortcut: "", tags: ["search"], server: "", container: "" },
        ],
        groups: [],
      },
    ],
  };
}

describe("add_bookmark", () => {
  it("should add a bookmark to the first group by default", () => {
    const result = executeTool("add_bookmark", { name: "Test", url: "https://test.com" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks).toHaveLength(3);
  });

  it("should reject javascript: URLs", () => {
    const result = executeTool("add_bookmark", { name: "Evil", url: "javascript:alert(1)" }, makeConfig());
    expect(result.success).toBe(false);
    expect(result.result).toContain("javascript:");
  });

  it("should add a bookmark to a specific group", () => {
    const result = executeTool("add_bookmark", { name: "Test", url: "https://test.com", group: "Default" }, makeConfig());
    expect(result.success).toBe(true);
  });

  it("should fail for non-existent group", () => {
    const result = executeTool("add_bookmark", { name: "Test", url: "https://test.com", group: "Missing" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("remove_bookmark", () => {
  it("should remove a bookmark by name", () => {
    const config = makeConfig();
    const result = executeTool("remove_bookmark", { name: "GitHub" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks).toHaveLength(1);
    expect(result.config.groups[0].bookmarks[0].name).toBe("Google");
  });

  it("should fail for non-existent bookmark", () => {
    const result = executeTool("remove_bookmark", { name: "Missing" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("update_bookmark", () => {
  it("should update bookmark fields", () => {
    const config = makeConfig();
    const result = executeTool("update_bookmark", { name: "GitHub", url: "https://github.com/new" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[0].url).toBe("https://github.com/new");
  });

  it("should allow clearing a field with empty string", () => {
    const config = makeConfig();
    const result = executeTool("update_bookmark", { name: "Google", description: "" }, config);
    expect(result.success).toBe(true);
    expect(result.config.groups[0].bookmarks[1].description).toBe("");
  });

  it("should fail when no updatable fields provided", () => {
    const result = executeTool("update_bookmark", { name: "GitHub" }, makeConfig());
    expect(result.success).toBe(false);
  });
});

describe("remove_widget", () => {
  it("should remove by index", () => {
    const config = makeConfig();
    const result = executeTool("remove_widget", { index: 0 }, config);
    expect(result.success).toBe(true);
    expect(result.config.widgets).toHaveLength(1);
    expect(result.config.widgets[0].type).toBe("weather");
  });

  it("should remove by type", () => {
    const config = makeConfig();
    const result = executeTool("remove_widget", { type: "weather" }, config);
    expect(result.success).toBe(true);
    expect(result.config.widgets).toHaveLength(1);
    expect(result.config.widgets[0].type).toBe("datetime");
  });

  it("should fail for invalid index", () => {
    const result = executeTool("remove_widget", { index: 99 }, makeConfig());
    expect(result.success).toBe(false);
  });

  it("should fail for non-existent type", () => {
    const config = makeConfig();
    config.widgets = [{ type: "datetime", config: {} }];
    const result = executeTool("remove_widget", { type: "logo" }, config);
    expect(result.success).toBe(false);
  });
});

describe("search_bookmarks", () => {
  it("should find bookmarks by name", () => {
    const result = executeTool("search_bookmarks", { query: "GitHub" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("GitHub");
  });

  it("should find bookmarks by tag", () => {
    const result = executeTool("search_bookmarks", { query: "search" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("Google");
  });

  it("should return no results for unmatched query", () => {
    const result = executeTool("search_bookmarks", { query: "zzzzz" }, makeConfig());
    expect(result.success).toBe(true);
    expect(result.result).toContain("No bookmarks found");
  });
});

describe("change_theme", () => {
  it("should change the theme", () => {
    const config = makeConfig();
    const result = executeTool("change_theme", { theme: "dark" }, config);
    expect(result.success).toBe(true);
    expect(result.config.settings.theme).toBe("dark");
  });
});
