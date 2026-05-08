import { z } from "zod";

const bookmarkSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1).refine(
    (url) => !url.toLowerCase().startsWith("javascript:"),
    { message: "javascript: URLs are not allowed" }
  ),
  icon: z.string().optional().default(""),
  description: z.string().optional().default(""),
  shortcut: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  server: z.string().optional().default(""),
  container: z.string().optional().default(""),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const groupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    icon: z.string().default(""),
    collapsed: z.boolean().default(false),
    bookmarks: z.array(bookmarkSchema).default([]),
    groups: z.array(groupSchema).default([]),
  })
);

const settingsSchema = z.object({
  title: z.string().default("My Dashboard"),
  theme: z.enum(["auto", "light", "dark"]).default("auto"),
  layout: z
    .object({
      columns: z.number().min(1).max(8).default(4),
    })
    .default({ columns: 4 }),
  search: z
    .object({
      engine: z.string().default("duckduckgo"),
      customUrl: z.string().default(""),
    })
    .default({ engine: "duckduckgo", customUrl: "" }),
  apiKey: z.string().default(""),
  apiBase: z.string().default("https://api.openai.com/v1"),
  aiModel: z.string().default("gpt-4o"),
  passwordHash: z.string().default(""),
});

export const configSchema = z.object({
  version: z.number().default(1),
  settings: settingsSchema,
  widgets: z
    .array(
      z.object({
        type: z.enum(["datetime", "greeting", "weather", "resources", "logo", "notes", "search"]),
        config: z.record(z.unknown()),
      })
    )
    .default([]),
  groups: z.array(groupSchema).default([]),
});

export const CURRENT_CONFIG_VERSION = 1;

export const DEFAULT_CONFIG = {
  version: 1,
  settings: {
    title: "My Dashboard",
    theme: "auto" as const,
    layout: { columns: 4 },
    search: { engine: "duckduckgo", customUrl: "" },
    apiKey: "",
    apiBase: "https://api.openai.com/v1",
    aiModel: "gpt-4o",
    passwordHash: "",
  },
  widgets: [
    {
      type: "datetime" as const,
      config: {
        format: { dateStyle: "full", timeStyle: "short" },
        locale: "zh",
      },
    },
  ],
  groups: [
    {
      name: "Getting Started",
      icon: "",
      bookmarks: [
        {
          name: "GitHub",
          url: "https://github.com",
          icon: "https://github.com/favicon.ico",
          description: "",
          shortcut: "",
          tags: [],
          server: "",
          container: "",
        },
      ],
    },
  ],
};
