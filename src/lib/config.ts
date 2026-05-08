import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { configSchema, DEFAULT_CONFIG, CURRENT_CONFIG_VERSION } from "./config-schema";
import type { AppConfig, SafeConfig } from "@/types/config";

const DATA_DIR = path.resolve(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "settings.yaml");

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
    const config = configSchema.parse(raw ?? {});
    // Run migrations if config is from an older version
    if (config.version < CURRENT_CONFIG_VERSION) {
      migrateConfig(config);
      config.version = CURRENT_CONFIG_VERSION;
      writeConfig(config);
    }
    // Overlay secrets from environment variables (env takes precedence)
    const apiKey = process.env.HOMEPAGE_API_KEY || config.settings.apiKey;
    const passwordHash = process.env.HOMEPAGE_PASSWORD_HASH || config.settings.passwordHash;
    if (apiKey !== config.settings.apiKey || passwordHash !== config.settings.passwordHash) {
      config.settings.apiKey = apiKey;
      config.settings.passwordHash = passwordHash;
    }
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
  // If secrets come from env vars, don't persist them to YAML
  if (process.env.HOMEPAGE_API_KEY) validated.settings.apiKey = "";
  if (process.env.HOMEPAGE_PASSWORD_HASH) validated.settings.passwordHash = "";
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

function migrateConfig(_config: AppConfig): void {
  // Add migration logic here for future versions
  // e.g. if upgrading from v1 to v2: add new fields with defaults
}
