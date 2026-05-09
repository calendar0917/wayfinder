import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { configSchema, DEFAULT_CONFIG, CURRENT_CONFIG_VERSION } from "./config-schema";
import type { AppConfig, SafeConfig, Group } from "@/types/config";

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "settings.yaml");

const DEFAULT_PASSWORD_HASH = "$2a$12$VwhkwP7xdXX0rhIY5l58.OoRGNVQPUlHAM6uBBCaIH0MX9zwbkq.G";

export function resolveEnvVar(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const match = value.match(/^\$\{(\w+)\}$/);
  if (match) {
    return process.env[match[1]] ?? value;
  }
  return value;
}

export function resolveString(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? `\${${name}}`);
}

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") return resolveEnvVar(obj);
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }
  return obj;
}

// Walk raw YAML + config in parallel, restoring ${VAR_NAME} patterns
// in integration headers so secrets never persist in the config object.
function restoreIntegrationHeaders(groups: Group[], rawGroups: unknown[]): void {
  for (let i = 0; i < groups.length && i < rawGroups.length; i++) {
    const rawGroup = rawGroups[i] as Record<string, unknown> | undefined;
    const rawBookmarks = (rawGroup?.bookmarks ?? []) as Record<string, unknown>[];
    for (let j = 0; j < groups[i].bookmarks.length && j < rawBookmarks.length; j++) {
      const b = groups[i].bookmarks[j];
      const rawB = rawBookmarks[j];
      if (b.integration?.headers && rawB?.integration) {
        const rawIntegration = rawB.integration as Record<string, unknown>;
        const rawHeaders = (rawIntegration.headers ?? {}) as Record<string, string>;
        for (const key of Object.keys(b.integration.headers)) {
          if (rawHeaders[key] !== undefined) {
            b.integration.headers[key] = rawHeaders[key];
          }
        }
      }
    }
    const rawSubGroups = (rawGroup?.groups ?? []) as unknown[];
    if (groups[i].groups) {
      restoreIntegrationHeaders(groups[i].groups, rawSubGroups);
    }
  }
}

function maskIntegrationHeaders(groups: Group[]): void {
  for (const g of groups) {
    for (const b of g.bookmarks ?? []) {
      if (b.integration?.headers) {
        for (const key of Object.keys(b.integration.headers)) {
          if (b.integration.headers[key]) {
            b.integration.headers[key] = "***";
          }
        }
      }
    }
    if (g.groups) maskIntegrationHeaders(g.groups);
  }
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readConfig(): AppConfig {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaults = configSchema.parse(DEFAULT_CONFIG);
    writeConfig(defaults);
    return defaults;
  }
  try {
    const raw = yaml.load(fs.readFileSync(CONFIG_FILE, "utf-8"));
    const resolved = resolveEnvVars(raw ?? {});
    const config = configSchema.parse(resolved);
    // Restore ${VAR_NAME} in integration headers — secrets must stay
    // as references so writeConfig never persists real values to YAML.
    restoreIntegrationHeaders(config.groups, (raw as Record<string, unknown>)?.groups as unknown[] ?? []);
    // Run migrations if config is from an older version
    if (config.version < CURRENT_CONFIG_VERSION) {
      migrateConfig(config);
      config.version = CURRENT_CONFIG_VERSION;
      writeConfig(config);
    }
    // Overlay secrets from environment variables (env takes precedence, then fallback to default)
    const apiKey = process.env.WAYFINDER_API_KEY || config.settings.apiKey;
    const passwordHash = process.env.WAYFINDER_PASSWORD_HASH || config.settings.passwordHash || DEFAULT_PASSWORD_HASH;
    const apiBase = process.env.WAYFINDER_API_BASE || config.settings.apiBase;
    const aiModel = process.env.WAYFINDER_AI_MODEL || config.settings.aiModel;
    config.settings.apiKey = apiKey;
    config.settings.passwordHash = passwordHash;
    config.settings.apiBase = apiBase;
    config.settings.aiModel = aiModel;
    return config;
  } catch {
    console.error("Config parse error, falling back to defaults");
    const defaults = configSchema.parse(DEFAULT_CONFIG);
    writeConfig(defaults);
    return defaults;
  }
}

export function writeConfig(config: AppConfig): void {
  ensureDataDir();
  const validated = configSchema.parse(config);
  // Never persist secrets to YAML — they only live in environment variables
  validated.settings.apiKey = "";
  validated.settings.passwordHash = "";
  const yamlStr = yaml.dump(validated, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
  fs.writeFileSync(CONFIG_FILE, yamlStr, "utf-8");
}

let writeQueue: Promise<void> = Promise.resolve();

export function withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
  let release: () => void;
  const prev = writeQueue;
  writeQueue = new Promise<void>((r) => { release = r; });
  return prev.then(() => fn()).finally(() => release!());
}

export function readConfigSafe(): SafeConfig {
  const config = readConfig();
  maskIntegrationHeaders(config.groups);
  return {
    ...config,
    settings: {
      ...config.settings,
      passwordHash: config.settings.passwordHash ? "***" : "",
      apiKey: config.settings.apiKey ? "***" : "",
    },
  };
}

function migrateConfig(config: AppConfig): void {
  // v1 -> v2: add statusCheck: false to all bookmarks
  if (config.version < 2) {
    function addStatusCheck(groups: Group[]) {
      for (const g of groups) {
        for (const b of g.bookmarks ?? []) {
          if (b.statusCheck === undefined) b.statusCheck = false;
        }
        if (g.groups) addStatusCheck(g.groups);
      }
    }
    addStatusCheck(config.groups);
  }
  // v2 -> v3: integration field is optional, no data mutation needed
  // v3 -> v4: add locale setting to existing configs
  if (config.version < 4) {
    if (!config.settings.locale) config.settings.locale = "en";
  }
  // v4 -> v5: add customCss setting
  if (config.version < 5) {
    if (config.settings.customCss === undefined) config.settings.customCss = "";
  }
}
