import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import yaml from "js-yaml";
import { configSchema, DEFAULT_CONFIG, CURRENT_CONFIG_VERSION } from "../config-schema";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "homepage-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const minimalSettings = {
  title: "My Dashboard",
  theme: "auto",
  layout: { columns: 4 },
  search: { engine: "duckduckgo", customUrl: "" },
  apiKey: "",
  apiBase: "https://api.openai.com/v1",
  aiModel: "gpt-4o",
  passwordHash: "",
};

describe("config-schema", () => {
  it("should parse a valid config", () => {
    const config = configSchema.parse(DEFAULT_CONFIG);
    expect(config.settings.title).toBe("My Dashboard");
    expect(config.version).toBe(CURRENT_CONFIG_VERSION);
  });

  it("should provide defaults for missing optional fields", () => {
    const config = configSchema.parse({ settings: minimalSettings });
    expect(config.settings.theme).toBe("auto");
    expect(config.settings.layout.columns).toBe(4);
    expect(config.version).toBe(1);
    expect(config.widgets).toEqual([]);
    expect(config.groups).toEqual([]);
  });

  it("should reject invalid theme values", () => {
    expect(() => configSchema.parse({ settings: { ...minimalSettings, theme: "neon" } })).toThrow();
  });

  it("should reject column count out of range", () => {
    expect(() => configSchema.parse({ settings: { ...minimalSettings, layout: { columns: 10 } } })).toThrow();
  });

  it("should reject javascript: URLs in bookmarks", () => {
    expect(() =>
      configSchema.parse({
        settings: minimalSettings,
        groups: [{ name: "Test", bookmarks: [{ name: "Evil", url: "javascript:alert(1)" }] }],
      })
    ).toThrow();
  });

  it("should accept valid bookmark URLs", () => {
    const config = configSchema.parse({
      settings: minimalSettings,
      groups: [{ name: "Test", bookmarks: [{ name: "OK", url: "https://example.com" }] }],
    });
    expect(config.groups[0].bookmarks[0].url).toBe("https://example.com");
  });

  it("should handle recursive groups", () => {
    const config = configSchema.parse({
      settings: minimalSettings,
      groups: [
        {
          name: "Parent",
          bookmarks: [],
          groups: [{ name: "Child", bookmarks: [{ name: "Link", url: "https://example.com" }] }],
        },
      ],
    });
    expect(config.groups[0].groups![0].name).toBe("Child");
  });
});

describe("config read/write integration", () => {
  it("should write and read back the same config", () => {
    const config = configSchema.parse(DEFAULT_CONFIG);
    const yamlStr = yaml.dump(config, { indent: 2, lineWidth: -1, noRefs: true });
    const filePath = path.join(tmpDir, "settings.yaml");
    fs.writeFileSync(filePath, yamlStr, "utf-8");

    const raw = yaml.load(fs.readFileSync(filePath, "utf-8"));
    const read = configSchema.parse(raw);
    expect(read.settings.title).toBe(config.settings.title);
    expect(read.version).toBe(config.version);
  });

  it("should add version field to configs without one", () => {
    const configWithoutVersion = {
      settings: minimalSettings,
      widgets: [],
      groups: [],
    };
    const parsed = configSchema.parse(configWithoutVersion);
    expect(parsed.version).toBe(1);
  });
});
