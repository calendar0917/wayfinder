export interface Settings {
  title: string;
  theme: "auto" | "light" | "dark";
  locale: string;
  layout: {
    columns: number;
  };
  search: {
    engine: string;
    customUrl: string;
  };
  apiKey: string;
  apiBase: string;
  aiModel: string;
  passwordHash: string;
}

export interface WidgetConfig {
  type: "datetime" | "greeting" | "weather" | "resources" | "logo" | "notes" | "search";
  config: Record<string, unknown>;
}

export interface IntegrationField {
  path: string;
  label: string;
}

export interface BookmarkIntegration {
  endpoint: string;
  headers: Record<string, string>;
  fields: IntegrationField[];
  display: "inline" | "badge" | "card";
  pollInterval: number;
}

export interface Bookmark {
  name: string;
  url: string;
  icon: string;
  description: string;
  shortcut: string;
  tags: string[];
  server: string;
  container: string;
  statusCheck?: boolean;
  integration?: BookmarkIntegration;
}

export interface Group {
  name: string;
  icon: string;
  collapsed: boolean;
  bookmarks: Bookmark[];
  groups: Group[];
}

export interface AppConfig {
  version: number;
  settings: Settings;
  widgets: WidgetConfig[];
  groups: Group[];
}

type Masked = "***" | "";

export interface SafeConfig extends Omit<AppConfig, "settings"> {
  settings: Omit<Settings, "passwordHash" | "apiKey"> & {
    passwordHash: Masked;
    apiKey: Masked;
  };
}
