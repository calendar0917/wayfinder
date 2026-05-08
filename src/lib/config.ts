import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { configSchema, DEFAULT_CONFIG } from "./config-schema";
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
    return configSchema.parse(raw ?? {});
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
