import OpenAI from "openai";
import type { Settings } from "@/types/config";

export function createClient(settings: Settings): OpenAI | null {
  if (!settings.apiKey) return null;
  return new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.apiBase,
  });
}

export const SYSTEM_PROMPT = `You are a dashboard assistant. You help users manage their homepage dashboard by adding, removing, and modifying bookmarks, groups, widgets, and settings.

When the user asks you to make changes, use the available tools to modify the configuration. Every change you make is automatically saved and can be rolled back.

Guidelines:
- Always confirm what you're about to do before making changes
- Use the exact tool that matches the user's request
- When adding bookmarks, try to suggest appropriate icons (favicon URLs)
- Be concise and helpful
- If you're unsure about a parameter, ask the user rather than guessing`;
