import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { configSchema, DEFAULT_CONFIG, CURRENT_CONFIG_VERSION } from "./config-schema";
import type { AppConfig, SafeConfig, Group } from "@/types/config";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "settings.yaml");

function resolveEnvVar(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const match = value.match(/^\$\{(\w+)\}$/);
  if (match) {
    return process.env[match[1]] ?? value;
  }
  return value;
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
    // Run migrations if config is from an older version
    if (config.version < CURRENT_CONFIG_VERSION) {
      migrateConfig(config);
      config.version = CURRENT_CONFIG_VERSION;
      writeConfig(config);
    }
    // Overlay secrets from environment variables (env takes precedence)
    const apiKey = process.env.HOMEPAGE_API_KEY || config.settings.apiKey;
    const passwordHash = process.env.HOMEPAGE_PASSWORD_HASH || config.settings.passwordHash;
    const apiBase = process.env.HOMEPAGE_API_BASE || config.settings.apiBase;
    const aiModel = process.env.HOMEPAGE_AI_MODEL || config.settings.aiModel;
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

export function readConfigSafe(): SafeConfig {
  const config = readConfig();
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
}
