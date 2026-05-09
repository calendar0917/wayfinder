import { z } from "zod";

const integrationFieldSchema = z.object({
  path: z.string().min(1),
  label: z.string().optional().default(""),
});

const integrationSchema = z.object({
  endpoint: z.string().min(1),
  headers: z.record(z.string()).optional().default({}),
  fields: z.array(integrationFieldSchema).min(1),
  display: z.enum(["inline", "badge", "card"]).optional().default("inline"),
  pollInterval: z.number().min(5).max(3600).optional().default(60),
});

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
  statusCheck: z.boolean().optional().default(false),
  integration: integrationSchema.optional(),
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
  locale: z.string().default("en"),
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
  customCss: z.string().optional().default(""),
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
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("datetime"),
          config: z.object({
            format: z.object({
              dateStyle: z.string().optional(),
              timeStyle: z.string().optional(),
              locale: z.string().optional(),
            }).optional(),
            locale: z.string().optional(),
          }).default({}),
        }),
        z.object({
          type: z.literal("greeting"),
          config: z.record(z.unknown()).default({}),
        }),
        z.object({
          type: z.literal("weather"),
          config: z.object({
            location: z.string().optional(),
            units: z.enum(["metric", "imperial"]).optional(),
          }).default({}),
        }),
        z.object({
          type: z.literal("resources"),
          config: z.record(z.unknown()).default({}),
        }),
        z.object({
          type: z.literal("logo"),
          config: z.record(z.unknown()).default({}),
        }),
        z.object({
          type: z.literal("notes"),
          config: z.record(z.unknown()).default({}),
        }),
        z.object({
          type: z.literal("search"),
          config: z.record(z.unknown()).default({}),
        }),
      ])
    )
    .default([]),
  groups: z.array(groupSchema).default([]),
});

export const CURRENT_CONFIG_VERSION = 5;

export const DEFAULT_CONFIG = {
  version: 4,
  settings: {
    title: "My Dashboard",
    theme: "auto" as const,
    locale: "en",
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
          statusCheck: false,
        },
      ],
    },
  ],
};
