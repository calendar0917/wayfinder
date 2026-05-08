import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeTool } from "../ai-tools";
import { configSchema, DEFAULT_CONFIG } from "../config-schema";

function makeConfig() {
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
        ],
        groups: [],
      },
    ],
  });
}

describe("executeTool", () => {
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    config = makeConfig();
  });

  describe("add_bookmark", () => {
    it("adds a bookmark to specified group", () => {
      const result = executeTool("add_bookmark", { name: "Google", url: "https://google.com", group: "Test Group" }, config);
      expect(result.success).toBe(true);
      expect(result.config.groups[0].bookmarks).toHaveLength(2);
    });

    it("rejects javascript: URLs", () => {
      const result = executeTool("add_bookmark", { name: "XSS", url: "javascript:alert(1)", group: "Test Group" }, config);
      expect(result.success).toBe(false);
    });

    it("defaults to first group when group not specified", () => {
      const result = executeTool("add_bookmark", { name: "Google", url: "https://google.com" }, config);
      expect(result.success).toBe(true);
      expect(result.config.groups[0].bookmarks).toHaveLength(2);
    });
  });

  describe("remove_bookmark", () => {
    it("removes a bookmark by name", () => {
      const result = executeTool("remove_bookmark", { name: "GitHub", group: "Test Group" }, config);
      expect(result.success).toBe(true);
      expect(result.config.groups[0].bookmarks).toHaveLength(0);
    });

    it("fails for non-existent bookmark", () => {
      const result = executeTool("remove_bookmark", { name: "NotFound" }, config);
      expect(result.success).toBe(false);
    });
  });

  describe("update_bookmark", () => {
    it("updates bookmark fields", () => {
      const result = executeTool("update_bookmark", { name: "GitHub", url: "https://github.com/new", group: "Test Group" }, config);
      expect(result.success).toBe(true);
      expect(result.config.groups[0].bookmarks[0].url).toBe("https://github.com/new");
    });
  });

  describe("move_bookmark", () => {
    it("moves bookmark between groups", () => {
      config.groups.push({ name: "Target Group", icon: "", collapsed: false, bookmarks: [], groups: [] });
      const result = executeTool("move_bookmark", { name: "GitHub", fromGroup: "Test Group", toGroup: "Target Group" }, config);
      expect(result.success).toBe(true);
      expect(config.groups[0].bookmarks).toHaveLength(0);
      expect(config.groups[1].bookmarks).toHaveLength(1);
    });
  });

  describe("add_group", () => {
    it("creates a new top-level group", () => {
      const result = executeTool("add_group", { name: "New Group" }, config);
      expect(result.success).toBe(true);
      expect(result.config.groups).toHaveLength(2);
    });

    it("creates a nested group", () => {
      const result = executeTool("add_group", { name: "Nested", parentGroup: "Test Group" }, config);
      expect(result.success).toBe(true);
      expect(result.config.groups[0].groups).toHaveLength(1);
    });
  });

  describe("remove_group", () => {
    it("removes a group", () => {
      const result = executeTool("remove_group", { name: "Test Group" }, config);
      expect(result.success).toBe(true);
      expect(result.config.groups).toHaveLength(0);
    });
  });

  describe("change_layout", () => {
    it("changes column count", () => {
      const result = executeTool("change_layout", { columns: 5 }, config);
      expect(result.success).toBe(true);
      expect(result.config.settings.layout.columns).toBe(5);
    });

    it("clamps columns between 1 and 8", () => {
      const result = executeTool("change_layout", { columns: 20 }, config);
      expect(result.success).toBe(true);
      expect(result.config.settings.layout.columns).toBe(8);
    });
  });

  describe("change_theme", () => {
    it("changes theme", () => {
      const result = executeTool("change_theme", { theme: "dark" }, config);
      expect(result.success).toBe(true);
      expect(result.config.settings.theme).toBe("dark");
    });
  });

  describe("search_bookmarks", () => {
    it("finds bookmarks by name", () => {
      const result = executeTool("search_bookmarks", { query: "github" }, config);
      expect(result.success).toBe(true);
      expect(result.result).toContain("GitHub");
    });
  });

  describe("unknown tool", () => {
    it("returns error for unknown tool name", () => {
      const result = executeTool("nonexistent", {}, config);
      expect(result.success).toBe(false);
      expect(result.result).toContain("Unknown tool");
    });
  });

  describe("duplicate prevention", () => {
    it("rejects bookmark with duplicate URL", () => {
      const result = executeTool("add_bookmark", { name: "GitHub2", url: "https://github.com", group: "Test Group" }, config);
      expect(result.success).toBe(false);
      expect(result.result).toContain("Duplicate URL");
    });

    it("allows bookmark with different URL", () => {
      const result = executeTool("add_bookmark", { name: "GitHub2", url: "https://github.com/other", group: "Test Group" }, config);
      expect(result.success).toBe(true);
    });
  });
});
