import { readConfig, resolveEnvVar } from "./config";
import type { AppConfig, Bookmark, Group, Page, IntegrationFieldType } from "@/types/config";
import { INTEGRATION_TEMPLATES } from "./integration-templates";

const VALID_FIELD_TYPES: IntegrationFieldType[] = ["text", "number", "percent", "status", "bytes", "duration", "bitrate", "temperature"];

interface ToolResult {
  success: boolean;
  result: string;
  config: AppConfig;
}

function findGroup(groups: Group[], name: string): Group | undefined {
  for (const g of groups) {
    if (g.name === name) return g;
    if (g.groups) {
      const found = findGroup(g.groups, name);
      if (found) return found;
    }
  }
  return undefined;
}

function findBookmarkInGroup(
  group: Group,
  name: string
): { group: Group; bookmark: Bookmark; index: number } | null {
  const idx = group.bookmarks?.findIndex((b) => b.name === name) ?? -1;
  if (idx >= 0 && group.bookmarks) {
    return { group, bookmark: group.bookmarks[idx], index: idx };
  }
  return null;
}

function findBookmark(
  groups: Group[],
  name: string,
  groupName?: string
): { group: Group; bookmark: Bookmark; index: number } | null {
  if (groupName) {
    const group = findGroup(groups, groupName);
    if (!group) return null;
    return findBookmarkInGroup(group, name);
  }
  for (const g of groups) {
    const found = findBookmarkInGroup(g, name);
    if (found) return found;
  }
  return null;
}

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "add_bookmark",
      description: "Add a bookmark to a group",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Bookmark display name" },
          url: { type: "string", description: "Bookmark URL" },
          group: { type: "string", description: "Group name (defaults to first group)" },
          icon: { type: "string", description: "Icon URL" },
          description: { type: "string", description: "Short description" },
          shortcut: { type: "string", description: "Keyboard shortcut hint" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
          statusCheck: { type: "boolean", description: "Enable HTTP status monitoring (default false)" },
        },
        required: ["name", "url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_bookmark",
      description: "Remove a bookmark by name",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Bookmark name" },
          group: { type: "string", description: "Group name (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_bookmark",
      description:
        "Update fields of an existing bookmark. Only pass the fields you want to change — omitted fields are left unchanged.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Current bookmark name (used to find it)" },
          group: { type: "string", description: "Group name (optional, helps locate bookmark)" },
          newName: { type: "string", description: "New name (optional)" },
          url: { type: "string", description: "New URL (optional)" },
          icon: { type: "string", description: "New icon URL (optional)" },
          description: { type: "string", description: "New description (optional)" },
          shortcut: { type: "string", description: "New shortcut hint (optional)" },
          tags: { type: "array", items: { type: "string" }, description: "New tags (optional)" },
          server: { type: "string", description: "Server hostname for Docker integration (optional)" },
          container: { type: "string", description: "Docker container name (optional)" },
          statusCheck: { type: "boolean", description: "Enable HTTP status monitoring (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "move_bookmark",
      description: "Move a bookmark between groups or reorder",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Bookmark name" },
          fromGroup: { type: "string", description: "Source group name" },
          toGroup: { type: "string", description: "Target group name" },
          position: { type: "number", description: "New position index (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_bookmarks",
      description: "Search bookmarks by name, URL, tags, or description",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_group",
      description: "Create a new bookmark group",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Group name" },
          icon: { type: "string", description: "Group icon URL" },
          parentGroup: { type: "string", description: "Parent group name for nesting" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_group",
      description: "Remove a group and all its bookmarks",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Group name" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reorder_bookmark",
      description: "Reorder a bookmark within its group by moving it from one position to another",
      parameters: {
        type: "object",
        properties: {
          group: { type: "string", description: "Group name" },
          fromIndex: { type: "number", description: "Current position index (0-based)" },
          toIndex: { type: "number", description: "New position index (0-based)" },
        },
        required: ["group", "fromIndex", "toIndex"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "rename_group",
      description: "Rename a group",
      parameters: {
        type: "object",
        properties: {
          oldName: { type: "string", description: "Current group name" },
          newName: { type: "string", description: "New group name" },
        },
        required: ["oldName", "newName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "change_layout",
      description: "Change page layout settings",
      parameters: {
        type: "object",
        properties: {
          columns: { type: "number", description: "Number of columns (1-8)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "change_theme",
      description: "Change the dashboard theme",
      parameters: {
        type: "object",
        properties: {
          theme: {
            type: "string",
            enum: ["auto", "light", "dark"],
            description: "Theme mode",
          },
        },
        required: ["theme"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_widget",
      description: "Add a widget. For weather include location in widgetConfig like {\"location\":\"Tokyo\",\"units\":\"metric\"}. Valid widgetType values: datetime, greeting, weather, search, notes, resources, logo.",
      parameters: {
        type: "object",
        properties: {
          widgetType: { type: "string", description: "One of: datetime, greeting, weather, search, notes, resources, logo" },
          widgetConfig: { type: "object", description: "Widget settings. Weather: {location,units}. Datetime: {format,locale}." },
        },
        required: ["widgetType"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_widget",
      description: "Remove a widget by widgetType or index",
      parameters: {
        type: "object",
        properties: {
          widgetType: { type: "string", description: "One of: datetime, greeting, weather, search, notes, resources, logo" },
          index: { type: "number", description: "Widget index (0-based) for removing by position" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_ai_settings",
      description: "Update AI provider settings (apiKey, apiBase, aiModel)",
      parameters: {
        type: "object",
        properties: {
          apiKey: { type: "string", description: "New API key (omit to keep current)" },
          apiBase: { type: "string", description: "API base URL" },
          aiModel: { type: "string", description: "Model name" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_password",
      description: "Set or change the dashboard password",
      parameters: {
        type: "object",
        properties: {
          password: { type: "string", description: "New password (min 4 chars)" },
        },
        required: ["password"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_config",
      description: "Explicitly save and git-commit current config",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reload_config",
      description: "Reload config from YAML (discard uncommitted changes)",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_title",
      description: "Update the dashboard title",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "New dashboard title" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_search",
      description: "Update search engine settings",
      parameters: {
        type: "object",
        properties: {
          engine: { type: "string", description: "Search engine (google, duckduckgo, bing, custom)" },
          customUrl: { type: "string", description: "Custom search URL (only used when engine is 'custom')" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_locale",
      description: "Update the dashboard locale/language (e.g. en, zh, ja, de)",
      parameters: {
        type: "object",
        properties: {
          locale: { type: "string", description: "BCP 47 language tag (e.g. en, zh, ja, de, fr)" },
        },
        required: ["locale"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "configure_integration",
      description: "Configure a live data integration on a bookmark. Use 'template' to auto-fill from a preset (call list_templates first), or provide endpoint/fields manually. For unknown APIs, call probe_endpoint first to discover the JSON structure. Header values can reference environment variables with ${VAR_NAME} syntax.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Bookmark name to add integration to" },
          group: { type: "string", description: "Group name (optional, helps locate bookmark)" },
          template: { type: "string", description: "Template ID from list_templates (e.g. 'portainer', 'pihole'). Auto-fills endpoint/fields — provide variables to substitute: HOST, API_KEY" },
          endpoint: { type: "string", description: "URL to fetch JSON data from. Required if no template; ignored when template is provided" },
          headers: {
            type: "object",
            description: "HTTP headers (values can use ${VAR_NAME} for secrets)",
            additionalProperties: { type: "string" },
          },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Dot-path to extract, e.g. 'data.playback.item.title'" },
                label: { type: "string", description: "Optional label prefix" },
                type: { type: "string", enum: ["text", "number", "percent", "status", "bytes", "duration", "bitrate", "temperature"], description: "Field display type (default: text)" },
              },
              required: ["path"],
            },
            description: "Fields to extract from the JSON response",
          },
          display: {
            type: "string",
            enum: ["inline", "badge", "card"],
            description: "Display mode (default: inline)",
          },
          pollInterval: {
            type: "number",
            description: "Poll interval in seconds (5-3600, default: 60)",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_templates",
      description: "List available integration templates with their IDs, required variables, and field summaries. Use before configure_integration to find the right template ID.",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", description: "Optional name/keyword filter (e.g. 'docker', 'media')" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "probe_endpoint",
      description: "Probe a JSON API endpoint and return its response structure. Use this before configure_integration when no template exists, so you can discover the real JSON shape and write correct field paths.",
      parameters: {
        type: "object",
        properties: {
          endpoint: { type: "string", description: "URL to probe" },
          headers: {
            type: "object",
            description: "HTTP headers (values can use ${VAR_NAME} for secrets)",
            additionalProperties: { type: "string" },
          },
        },
        required: ["endpoint"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_env_vars",
      description: "List available environment variable names (values are NOT exposed). Use this to discover which ${VAR_NAME} secrets are available for integration headers, so you never need to ask users for API keys in plain text.",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", description: "Optional keyword filter (e.g. 'API', 'PORTAINER', 'KEY')" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_integration",
      description: "Remove the integration from a bookmark",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Bookmark name" },
          group: { type: "string", description: "Group name (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_widget_config",
      description: "Update the config of an existing widget. You can find the widget index from the current config context above. For weather: {location:'city',units:'metric'|'imperial'}. For datetime: {format:{dateStyle,timeStyle},locale}.",
      parameters: {
        type: "object",
        properties: {
          index: { type: "number", description: "Widget index from current config" },
          widgetType: { type: "string", description: "Widget type (used to find widget if index not provided)" },
          widgetConfig: { type: "object", description: "New widget config object" },
        },
        required: ["widgetConfig"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_custom_css",
      description: "Update the dashboard custom CSS. Use CSS custom properties (e.g. --accent, --bg, --text, --surface) and standard selectors. The CSS replaces the entire custom stylesheet.",
      parameters: {
        type: "object",
        properties: {
          css: { type: "string", description: "Complete CSS string to apply" },
        },
        required: ["css"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_page",
      description: "Add a new page tab to the dashboard. Pages let you organize groups into different tabs.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Page name" },
          groups: { type: "array", items: { type: "string" }, description: "Group names to show on this page" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_page",
      description: "Remove a page tab from the dashboard",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Page name to remove" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_page",
      description: "Update a page tab's name or assigned groups",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Current page name" },
          newName: { type: "string", description: "New page name (optional)" },
          groups: { type: "array", items: { type: "string" }, description: "New list of group names for this page" },
        },
        required: ["name"],
      },
    },
  },
];

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  config: AppConfig
): ToolResult {
  switch (name) {
    case "add_bookmark": {
      if (args.url && String(args.url).toLowerCase().startsWith("javascript:")) {
        return { success: false, result: "javascript: URLs are not allowed", config };
      }
      // Duplicate URL detection
      const newUrl = String(args.url).toLowerCase().replace(/\/+$/, "");
      function findDuplicateUrl(groups: Group[]): string | null {
        for (const g of groups) {
          for (const b of g.bookmarks ?? []) {
            if (b.url.toLowerCase().replace(/\/+$/, "") === newUrl) {
              return `'${b.name}' in group '${g.name}' already uses this URL`;
            }
          }
          if (g.groups) {
            const found = findDuplicateUrl(g.groups);
            if (found) return found;
          }
        }
        return null;
      }
      const duplicate = findDuplicateUrl(config.groups);
      if (duplicate) {
        return { success: false, result: `Duplicate URL: ${duplicate}`, config };
      }
      const groupName = (args.group as string) || config.groups[0]?.name;
      if (!groupName) {
        return { success: false, result: "No group found", config };
      }
      const group = findGroup(config.groups, groupName);
      if (!group) {
        return {
          success: false,
          result: `Group '${groupName}' not found`,
          config,
        };
      }
      if (!group.bookmarks) group.bookmarks = [];
      const bookmark: Bookmark = {
        name: args.name as string,
        url: args.url as string,
        icon: (args.icon as string) || "",
        description: (args.description as string) || "",
        shortcut: (args.shortcut as string) || "",
        tags: (args.tags as string[]) || [],
        server: (args.server as string) || "",
        container: (args.container as string) || "",
        statusCheck: (args.statusCheck as boolean) || false,
      };
      group.bookmarks.push(bookmark);
      return {
        success: true,
        result: `Bookmark '${bookmark.name}' added to group '${groupName}'`,
        config,
      };
    }

    case "remove_bookmark": {
      const bookmarkName = (args.name as string)?.trim();
      if (!bookmarkName) {
        return { success: false, result: "Bookmark name is required", config };
      }
      const found = findBookmark(config.groups, bookmarkName, args.group as string | undefined);
      if (!found) {
        return {
          success: false,
          result: `Bookmark '${bookmarkName}' not found`,
          config,
        };
      }
      found.group.bookmarks!.splice(found.index, 1);
      return {
        success: true,
        result: `Bookmark '${bookmarkName}' removed`,
        config,
      };
    }

    case "update_bookmark": {
      const bookmarkName = (args.name as string)?.trim();
      if (!bookmarkName) {
        return { success: false, result: "Bookmark name is required", config };
      }
      const found = findBookmark(config.groups, bookmarkName, args.group as string | undefined);
      if (!found) {
        return {
          success: false,
          result: `Bookmark '${bookmarkName}' not found`,
          config,
        };
      }
      const fieldMap: Record<string, string> = {
        newName: "name",
        url: "url",
        icon: "icon",
        description: "description",
        shortcut: "shortcut",
        tags: "tags",
        server: "server",
        container: "container",
        statusCheck: "statusCheck",
      };
      const applied: string[] = [];
      for (const [argKey, bookmarkKey] of Object.entries(fieldMap)) {
        if (args[argKey] !== undefined) {
          (found.bookmark as unknown as Record<string, unknown>)[bookmarkKey] = args[argKey];
          applied.push(`${bookmarkKey}="${args[argKey]}"`);
        }
      }
      if (applied.length === 0) {
        return {
          success: false,
          result: "No fields provided to update",
          config,
        };
      }
      return {
        success: true,
        result: `Bookmark '${args.name}' updated: ${applied.join(", ")}`,
        config,
      };
    }

    case "move_bookmark": {
      const fromGroup = (args.fromGroup as string) || config.groups[0]?.name;
      const toGroupName = (args.toGroup as string) || fromGroup;
      if (!fromGroup) {
        return { success: false, result: "No source group specified", config };
      }
      const src = findGroup(config.groups, fromGroup);
      const dst = findGroup(config.groups, toGroupName!);
      if (!src || !dst) {
        return {
          success: false,
          result: "Source or target group not found",
          config,
        };
      }
      const idx = src.bookmarks?.findIndex((b) => b.name === args.name) ?? -1;
      if (idx < 0) {
        return {
          success: false,
          result: `Bookmark '${args.name}' not found in '${fromGroup}'`,
          config,
        };
      }
      const [bookmark] = src.bookmarks!.splice(idx, 1);
      if (!dst.bookmarks) dst.bookmarks = [];
      const pos = (args.position as number) ?? dst.bookmarks.length;
      dst.bookmarks.splice(pos, 0, bookmark);
      return {
        success: true,
        result: `Bookmark '${args.name}' moved from '${fromGroup}' to '${toGroupName}'`,
        config,
      };
    }

    case "search_bookmarks": {
      const q = ((args.query as string) || "").toLowerCase();
      const results: string[] = [];
      function searchInGroups(groups: Group[], prefix = "") {
        for (const g of groups) {
          for (const b of g.bookmarks ?? []) {
            if (
              b.name.toLowerCase().includes(q) ||
              b.url.toLowerCase().includes(q) ||
              b.description?.toLowerCase().includes(q) ||
              b.tags?.some((t) => t.toLowerCase().includes(q))
            ) {
              results.push(`${prefix}${g.name}/${b.name} — ${b.url}`);
            }
          }
          if (g.groups) searchInGroups(g.groups, `${prefix}${g.name}/`);
        }
      }
      searchInGroups(config.groups);
      return {
        success: true,
        result: results.length ? results.join("\n") : "No bookmarks found",
        config,
      };
    }

    case "add_group": {
      const parent = args.parentGroup as string | undefined;
      const newGroup: Group = {
        name: args.name as string,
        icon: (args.icon as string) || "",
        collapsed: false,
        bookmarks: [],
        groups: [],
      };
      if (parent) {
        const pg = findGroup(config.groups, parent);
        if (!pg) {
          return {
            success: false,
            result: `Parent group '${parent}' not found`,
            config,
          };
        }
        if (!pg.groups) pg.groups = [];
        pg.groups.push(newGroup);
      } else {
        config.groups.push(newGroup);
      }
      return {
        success: true,
        result: `Group '${args.name}' created`,
        config,
      };
    }

    case "remove_group": {
      function removeGroup(groups: Group[], name: string): boolean {
        const idx = groups.findIndex((g) => g.name === name);
        if (idx >= 0) {
          groups.splice(idx, 1);
          return true;
        }
        for (const g of groups) {
          if (g.groups && removeGroup(g.groups, name)) return true;
        }
        return false;
      }
      const groupName = args.name as string;
      if (removeGroup(config.groups, groupName)) {
        // Clean up page references
        if (config.pages) {
          for (const page of config.pages) {
            page.groups = page.groups.filter((g) => g !== groupName);
          }
        }
        return {
          success: true,
          result: `Group '${groupName}' removed`,
          config,
        };
      }
      return {
        success: false,
        result: `Group '${groupName}' not found`,
        config,
      };
    }

    case "reorder_bookmark": {
      const group = findGroup(config.groups, args.group as string);
      if (!group) {
        return { success: false, result: `Group '${args.group}' not found`, config };
      }
      const from = args.fromIndex as number;
      const to = args.toIndex as number;
      if (!group.bookmarks || from < 0 || from >= group.bookmarks.length || to < 0 || to >= group.bookmarks.length) {
        return { success: false, result: "Invalid index", config };
      }
      const [bookmark] = group.bookmarks.splice(from, 1);
      group.bookmarks.splice(to, 0, bookmark);
      return { success: true, result: `Bookmark moved from position ${from} to ${to}`, config };
    }

    case "rename_group": {
      const group = findGroup(config.groups, args.oldName as string);
      if (!group) {
        return {
          success: false,
          result: `Group '${args.oldName}' not found`,
          config,
        };
      }
      const oldName = args.oldName as string;
      const newName = args.newName as string;
      group.name = newName;
      // Update page references
      if (config.pages) {
        for (const page of config.pages) {
          const idx = page.groups.indexOf(oldName);
          if (idx >= 0) page.groups[idx] = newName;
        }
      }
      return {
        success: true,
        result: `Group renamed from '${oldName}' to '${newName}'`,
        config,
      };
    }

    case "change_layout": {
      if (args.columns) {
        config.settings.layout.columns = Math.max(1, Math.min(8, args.columns as number));
      }
      return {
        success: true,
        result: `Layout updated: ${config.settings.layout.columns} columns`,
        config,
      };
    }

    case "change_theme": {
      config.settings.theme = args.theme as "auto" | "light" | "dark";
      return {
        success: true,
        result: `Theme changed to '${config.settings.theme}'`,
        config,
      };
    }

    case "add_widget": {
      const validTypes = ["datetime", "greeting", "weather", "resources", "logo", "notes", "search"] as const;
      const rawType = args.widgetType || args.type;
      if (!rawType) {
        return { success: false, result: "Missing required parameter 'widgetType'", config };
      }
      const widgetType = String(rawType).toLowerCase();
      if (!validTypes.includes(widgetType as typeof validTypes[number])) {
        return { success: false, result: `Invalid widget type '${rawType}'. Must be one of: ${validTypes.join(", ")}`, config };
      }
      let widgetConfig: Record<string, unknown> = {};
      if (args.widgetConfig && typeof args.widgetConfig === "object" && !Array.isArray(args.widgetConfig)) {
        widgetConfig = args.widgetConfig as Record<string, unknown>;
      } else if (typeof args.widgetConfig === "string") {
        try { widgetConfig = JSON.parse(args.widgetConfig); } catch { /* use empty */ }
      } else if (args.config && typeof args.config === "object" && !Array.isArray(args.config)) {
        widgetConfig = args.config as Record<string, unknown>;
      } else if (typeof args.config === "string") {
        try { widgetConfig = JSON.parse(args.config); } catch { /* use empty */ }
      }
      config.widgets.push({
        type: widgetType as typeof validTypes[number],
        config: widgetConfig,
      });
      let hint = "";
      if (widgetType === "weather" && !widgetConfig.location) {
        hint = " NOTE: Weather widget needs a location. Use update_widget_config with the widget index and {location:'city name'} to set it.";
      }
      return {
        success: true,
        result: `Widget '${widgetType}' added at index ${config.widgets.length - 1}${hint}`,
        config,
      };
    }

    case "remove_widget": {
      if (args.index !== undefined) {
        const idx = args.index as number;
        if (idx < 0 || idx >= config.widgets.length) {
          return {
            success: false,
            result: `Widget index ${idx} out of range`,
            config,
          };
        }
        const removed = config.widgets.splice(idx, 1)[0];
        return {
          success: true,
          result: `Widget '${removed.type}' removed`,
          config,
        };
      }
      const removeType = args.widgetType || args.type;
      const idx = config.widgets.findIndex((w) => w.type === removeType);
      if (idx < 0) {
        return {
          success: false,
          result: `Widget '${removeType}' not found`,
          config,
        };
      }
      config.widgets.splice(idx, 1);
      return {
        success: true,
        result: `Widget '${removeType}' removed`,
        config,
      };
    }

    case "update_ai_settings": {
      if (args.apiKey && typeof args.apiKey === "string") {
        config.settings.apiKey = args.apiKey;
      }
      if (args.apiBase && typeof args.apiBase === "string") {
        config.settings.apiBase = args.apiBase;
      }
      if (args.aiModel && typeof args.aiModel === "string") {
        config.settings.aiModel = args.aiModel;
      }
      return {
        success: true,
        result: "AI settings updated",
        config,
      };
    }

    case "set_password": {
      const pwd = args.password as string;
      if (!pwd || pwd.length < 4) {
        return {
          success: false,
          result: "Password must be at least 4 characters",
          config,
        };
      }
      // Hash will be applied by the mutate route before writing
      config.settings.passwordHash = `HASH:${pwd}`;
      return {
        success: true,
        result: "Password set. User will need to login on next visit.",
        config,
      };
    }

    case "save_config": {
      return {
        success: true,
        result: "Config saved (auto-saved on every change)",
        config,
      };
    }

    case "reload_config": {
      return {
        success: true,
        result: "Config reloaded from YAML",
        config: readConfig(),
      };
    }

    case "update_title": {
      const title = args.title as string;
      if (!title || !title.trim()) {
        return { success: false, result: "Title cannot be empty", config };
      }
      config.settings.title = title.trim();
      return { success: true, result: `Title updated to '${config.settings.title}'`, config };
    }

    case "update_search": {
      const validEngines = ["google", "duckduckgo", "bing", "custom"];
      const engine = (args.engine as string) || config.settings.search.engine;
      if (!validEngines.includes(engine)) {
        return { success: false, result: `Invalid search engine. Must be one of: ${validEngines.join(", ")}`, config };
      }
      config.settings.search.engine = engine;
      if (args.customUrl !== undefined) {
        config.settings.search.customUrl = args.customUrl as string;
      }
      return { success: true, result: `Search updated: engine=${config.settings.search.engine}`, config };
    }

    case "update_locale": {
      const locale = (args.locale as string || "").trim();
      if (!locale) return { success: false, result: "Locale is required", config };
      config.settings.locale = locale;
      return { success: true, result: `Locale updated to '${locale}'`, config };
    }

    case "configure_integration": {
      const intBookmarkName = (args.name as string)?.trim();
      if (!intBookmarkName) {
        return { success: false, result: "Bookmark name is required", config };
      }
      const found = findBookmark(config.groups, intBookmarkName, args.group as string | undefined);
      if (!found) {
        return { success: false, result: `Bookmark '${args.name}' not found`, config };
      }

      let endpoint = args.endpoint as string | undefined;
      let headers = (args.headers as Record<string, string>) || {};
      let fields = args.fields as Array<{ path: string; label?: string; type?: string }> | undefined;
      let display: "inline" | "badge" | "card" | undefined;

      // Template mode: auto-fill from template
      if (args.template) {
        const tpl = INTEGRATION_TEMPLATES.find((t) => t.id === (args.template as string));
        if (!tpl) {
          const available = INTEGRATION_TEMPLATES.map((t) => t.id).join(", ");
          return { success: false, result: `Template '${args.template}' not found. Available: ${available}`, config };
        }

        // Auto-resolve HOST from bookmark URL
        const bookmarkUrl = found.bookmark.url;
        let hostFromUrl = "";
        try {
          const u = new URL(bookmarkUrl);
          hostFromUrl = u.hostname + (u.port && u.port !== "80" && u.port !== "443" ? `:${u.port}` : "");
        } catch { /* bookmark URL might be invalid, AI must provide HOST explicitly */ }

        // Substitute: HOST from bookmark URL, other vars from args or env
        const vars: Record<string, string> = { HOST: hostFromUrl };
        for (const [key, val] of Object.entries(args)) {
          if (typeof val === "string" && key !== "name" && key !== "group" && key !== "template" && key !== "display" && key !== "pollInterval") {
            vars[key] = val;
          }
        }
        const substitute = (s: string) => s.replace(/\$\{(\w+)\}/g, (_, k) => {
          if (vars[k]) return vars[k];
          // Keep ${VAR_NAME} as-is for env vars (resolved at proxy time by resolveString)
          return `\${${k}}`;
        });

        endpoint = substitute(tpl.endpoint);
        const tplHeaders: Record<string, string> = {};
        if (tpl.headers) {
          for (const [k, v] of Object.entries(tpl.headers)) {
            tplHeaders[k] = substitute(v);
          }
        }
        headers = { ...tplHeaders, ...headers };
        fields = tpl.fields.map((f) => ({ path: f.path, label: f.label, type: f.type }));
        if (!display) display = tpl.display;
      }

      if (!endpoint) {
        return { success: false, result: "Endpoint is required (provide 'endpoint' or 'template')", config };
      }
      try {
        const parsed = new URL(endpoint);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return { success: false, result: "Only HTTP(S) endpoints allowed", config };
        }
      } catch {
        return { success: false, result: `Invalid endpoint URL: ${endpoint}`, config };
      }
      if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return { success: false, result: "At least one field path is required", config };
      }
      found.bookmark.integration = {
        endpoint,
        headers,
        fields: fields.map((f) => ({
          path: f.path,
          label: f.label || "",
          type: (VALID_FIELD_TYPES.includes(f.type as IntegrationFieldType) ? f.type : "text") as IntegrationFieldType,
        })),
        display: display || "inline",
        pollInterval: typeof args.pollInterval === "number" ? Math.max(5, Math.min(3600, args.pollInterval)) : 60,
      };
      return {
        success: true,
        result: `Integration configured on '${args.name}': ${found.bookmark.integration!.display} display, ${found.bookmark.integration!.fields.length} field(s), polling every ${found.bookmark.integration!.pollInterval}s`,
        config,
      };
    }

    case "list_templates": {
      const filter = ((args.filter as string) || "").toLowerCase();
      const templates = INTEGRATION_TEMPLATES
        .filter((t) => !filter || t.name.toLowerCase().includes(filter) || t.id.includes(filter))
        .map((t) => {
          // Extract variable names from endpoint/headers
          const varPattern = /\$\{(\w+)\}/g;
          const vars = new Set<string>();
          let m: RegExpExecArray | null;
          while ((m = varPattern.exec(t.endpoint)) !== null) vars.add(m[1]);
          if (t.headers) {
            for (const v of Object.values(t.headers)) {
              while ((m = varPattern.exec(v)) !== null) vars.add(m[1]);
            }
          }
          return {
            id: t.id,
            name: t.name,
            icon: t.icon,
            variables: [...vars],
            fields: t.fields.map((f) => `${f.path} (${f.label}, ${f.type})`),
            display: t.display,
          };
        });
      return {
        success: true,
        result: templates.length
          ? templates.map((t) => `${t.id}: ${t.name} ${t.icon} — vars: ${t.variables.join(", ") || "none"} — fields: ${t.fields.join("; ")} — display: ${t.display}`).join("\n")
          : "No templates found",
        config,
      };
    }

    case "probe_endpoint": {
      const probeUrl = args.endpoint as string;
      if (!probeUrl) {
        return { success: false, result: "Endpoint URL is required", config };
      }
      try {
        new URL(probeUrl);
      } catch {
        return { success: false, result: "Invalid endpoint URL", config };
      }
      // Return a marker so the chat route knows to proxy this request
      return {
        success: true,
        result: `__PROBE__${JSON.stringify({ endpoint: probeUrl, headers: args.headers || {} })}`,
        config,
      };
    }

    case "list_env_vars": {
      const filter = ((args.filter as string) || "").toLowerCase();
      const allVars = Object.keys(process.env).sort();
      const filtered = filter
        ? allVars.filter((v) => v.toLowerCase().includes(filter))
        : allVars.filter((v) => {
            // Default: show likely relevant vars (keys, hosts, tokens, URLs)
            const lower = v.toLowerCase();
            return lower.includes("api") || lower.includes("key") || lower.includes("token") ||
              lower.includes("host") || lower.includes("url") || lower.includes("secret") ||
              lower.includes("sid") || lower.includes("cookie");
          });
      return {
        success: true,
        result: filtered.length
          ? `Available env vars (values NOT exposed): ${filtered.join(", ")}\nReference them in integration headers as \${VAR_NAME}`
          : "No matching environment variables found. Add them to your .env.local file.",
        config,
      };
    }

    case "remove_integration": {
      const riName = (args.name as string)?.trim();
      if (!riName) {
        return { success: false, result: "Bookmark name is required", config };
      }
      const found = findBookmark(config.groups, riName, args.group as string | undefined);
      if (!found) {
        return { success: false, result: `Bookmark '${args.name}' not found`, config };
      }
      if (!found.bookmark.integration) {
        return { success: false, result: `Bookmark '${args.name}' has no integration`, config };
      }
      found.bookmark.integration = undefined;
      return { success: true, result: `Integration removed from '${args.name}'`, config };
    }

    case "update_widget_config": {
      let idx = Number(args.index);
      if (!Number.isInteger(idx) || idx < 0 || idx >= config.widgets.length) {
        // Try finding by type instead
        const searchType = args.widgetType || args.type;
        if (searchType) {
          idx = config.widgets.findIndex(w => w.type === String(searchType).toLowerCase());
        }
        if (idx < 0) {
          // Default to last widget (most recently added)
          idx = config.widgets.length - 1;
        }
        if (idx < 0 || idx >= config.widgets.length) {
          return { success: false, result: `Cannot find widget (index=${args.index}, type=${searchType}). ${config.widgets.length} widgets exist.`, config };
        }
      }
      let newConfig: Record<string, unknown> = {};
      const rawConfig = args.widgetConfig || args.config;
      if (rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)) {
        newConfig = rawConfig as Record<string, unknown>;
      } else if (typeof rawConfig === "string") {
        try { newConfig = JSON.parse(rawConfig); } catch { /* use empty */ }
      }
      config.widgets[idx] = { ...config.widgets[idx], config: newConfig };
      return { success: true, result: `Widget ${config.widgets[idx].type} config updated`, config };
    }

    case "update_custom_css": {
      let css: string = "";
      if (typeof args.css === "string") {
        css = args.css;
      } else if (typeof args.css === "object" && args.css !== null) {
        css = JSON.stringify(args.css);
      }
      if (!css) {
        return { success: false, result: "css must be a string", config };
      }
      // Strip wrapping quotes if the model double-quoted the string
      if (css.startsWith('"') && css.endsWith('"') && css.length >= 2) {
        try { css = JSON.parse(css) as string; } catch { /* not JSON-quoted, use as-is */ }
      }
      if (!css.trim()) {
        return { success: false, result: "css cannot be empty", config };
      }
      // Basic sanitization: strip <script> tags
      const sanitized = css.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script>/gi, "");
      config.settings.customCss = sanitized;
      return { success: true, result: `Custom CSS updated (${sanitized.length} chars)`, config };
    }

    case "add_page": {
      const pageName = (args.name as string)?.trim();
      if (!pageName) return { success: false, result: "Page name is required", config };
      if (!config.pages) config.pages = [];
      if (config.pages.some((p) => p.name === pageName)) {
        return { success: false, result: `Page '${pageName}' already exists`, config };
      }
      const page: Page = { name: pageName, groups: (args.groups as string[]) || [] };
      config.pages.push(page);
      return { success: true, result: `Page '${pageName}' created`, config };
    }

    case "remove_page": {
      const pageName = (args.name as string)?.trim();
      if (!pageName) return { success: false, result: "Page name is required", config };
      if (!config.pages) return { success: false, result: "No pages configured", config };
      const idx = config.pages.findIndex((p) => p.name === pageName);
      if (idx < 0) return { success: false, result: `Page '${pageName}' not found`, config };
      config.pages.splice(idx, 1);
      if (config.pages.length === 0) config.pages = undefined;
      return { success: true, result: `Page '${pageName}' removed`, config };
    }

    case "update_page": {
      const pageName = (args.name as string)?.trim();
      if (!pageName) return { success: false, result: "Page name is required", config };
      if (!config.pages) return { success: false, result: "No pages configured", config };
      const page = config.pages.find((p) => p.name === pageName);
      if (!page) return { success: false, result: `Page '${pageName}' not found`, config };
      if (args.newName) page.name = args.newName as string;
      if (args.groups) page.groups = args.groups as string[];
      return { success: true, result: `Page '${pageName}' updated`, config };
    }

    default:
      return {
        success: false,
        result: `Unknown tool: ${name}`,
        config,
      };
  }
}
