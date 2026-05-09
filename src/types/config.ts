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
  customCss?: string;
  apiKey: string;
  apiBase: string;
  aiModel: string;
  passwordHash: string;
}

export interface DateTimeConfig {
  format?: { dateStyle?: string; timeStyle?: string; locale?: string };
  locale?: string;
}

export interface WeatherConfig {
  location?: string;
  units?: "metric" | "imperial";
}

export type WidgetConfig =
  | { type: "datetime"; config: DateTimeConfig }
  | { type: "greeting"; config: Record<string, unknown> }
  | { type: "weather"; config: WeatherConfig }
  | { type: "resources"; config: Record<string, unknown> }
  | { type: "logo"; config: Record<string, unknown> }
  | { type: "notes"; config: Record<string, unknown> }
  | { type: "search"; config: Record<string, unknown> };

export type IntegrationFieldType = "text" | "number" | "percent" | "status" | "bytes" | "duration" | "bitrate" | "temperature";

export interface IntegrationField {
  path: string;
  label: string;
  type?: IntegrationFieldType;
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

export interface Page {
  name: string;
  groups: string[];
}

export interface AppConfig {
  version: number;
  settings: Settings;
  widgets: WidgetConfig[];
  groups: Group[];
  pages?: Page[];
}

type Masked = "***" | "";

export interface SafeConfig extends Omit<AppConfig, "settings"> {
  settings: Omit<Settings, "passwordHash" | "apiKey"> & {
    passwordHash: Masked;
    apiKey: Masked;
  };
}
