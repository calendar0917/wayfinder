import { describe, it, expect } from "vitest";
import { buildSearchUrl, getEngineName } from "../search";

describe("buildSearchUrl", () => {
  it("should build Google search URL", () => {
    const url = buildSearchUrl("google", "hello world");
    expect(url).toBe("https://www.google.com/search?q=hello%20world");
  });

  it("should build DuckDuckGo search URL", () => {
    const url = buildSearchUrl("duckduckgo", "test");
    expect(url).toBe("https://duckduckgo.com/?q=test");
  });

  it("should build Bing search URL", () => {
    const url = buildSearchUrl("bing", "test");
    expect(url).toBe("https://www.bing.com/search?q=test");
  });

  it("should build custom URL with query replacement", () => {
    const url = buildSearchUrl("custom", "test", "https://example.com/search?q={query}");
    expect(url).toBe("https://example.com/search?q=test");
  });

  it("should default to DuckDuckGo for unknown engine", () => {
    const url = buildSearchUrl("unknown", "test");
    expect(url).toBe("https://duckduckgo.com/?q=test");
  });

  it("should encode special characters", () => {
    const url = buildSearchUrl("google", "hello & world");
    expect(url).toContain("hello%20%26%20world");
  });
});

describe("getEngineName", () => {
  it("should return proper names", () => {
    expect(getEngineName("google")).toBe("Google");
    expect(getEngineName("duckduckgo")).toBe("DuckDuckGo");
    expect(getEngineName("bing")).toBe("Bing");
    expect(getEngineName("custom")).toBe("Custom");
  });

  it("should return the engine string for unknown engines", () => {
    expect(getEngineName("ecosia")).toBe("ecosia");
  });
});
