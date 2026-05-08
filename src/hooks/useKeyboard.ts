"use client";

import { useEffect } from "react";
import type { Group } from "@/types/config";

interface PanelState {
  aiOpen: boolean;
  paletteOpen: boolean;
  settingsOpen: boolean;
}

interface PanelActions {
  setAiOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setPaletteOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setSettingsOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  authenticated: boolean;
}

function flattenBookmarks(groups: Group[]): string[] {
  const urls: string[] = [];
  for (const g of groups) {
    for (const b of g.bookmarks ?? []) {
      urls.push(b.url);
    }
    if (g.groups) urls.push(...flattenBookmarks(g.groups));
  }
  return urls;
}

export function useKeyboard(panels: PanelState, actions: PanelActions, groups?: Group[]) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        actions.setPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        actions.setPaletteOpen(true);
        return;
      }
      if (e.key === "j" && (e.metaKey || e.ctrlKey) && actions.authenticated) {
        e.preventDefault();
        actions.setAiOpen((prev) => !prev);
        return;
      }
      // Number keys 1-9 to open first 9 bookmarks (only when no panel open and not in input)
      if (groups && !inInput && !panels.aiOpen && !panels.paletteOpen && !panels.settingsOpen) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const urls = flattenBookmarks(groups);
          if (urls[num - 1]) {
            window.open(urls[num - 1], "_blank");
            return;
          }
        }
      }
      if (e.key === "Escape") {
        if (panels.aiOpen) { actions.setAiOpen(false); return; }
        if (panels.paletteOpen) { actions.setPaletteOpen(false); return; }
        if (panels.settingsOpen) { actions.setSettingsOpen(false); return; }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [panels, actions, groups]);
}
