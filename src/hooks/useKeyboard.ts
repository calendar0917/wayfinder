"use client";

import { useEffect, useRef } from "react";
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

function flattenBookmarkUrls(groups: Group[]): string[] {
  const urls: string[] = [];
  for (const g of groups) {
    for (const b of g.bookmarks ?? []) {
      urls.push(b.url);
    }
    if (g.groups) urls.push(...flattenBookmarkUrls(g.groups));
  }
  return urls;
}

export function useKeyboard(panels: PanelState, actions: PanelActions, groups?: Group[]) {
  const panelsRef = useRef(panels);
  const actionsRef = useRef(actions);
  const groupsRef = useRef(groups);

  panelsRef.current = panels;
  actionsRef.current = actions;
  groupsRef.current = groups;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      const p = panelsRef.current;
      const a = actionsRef.current;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        a.setPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        a.setPaletteOpen(true);
        return;
      }
      if (e.key === "j" && (e.metaKey || e.ctrlKey) && a.authenticated) {
        e.preventDefault();
        a.setAiOpen((prev) => !prev);
        return;
      }
      // Number keys 1-9 to open first 9 bookmarks (only when no panel open and not in input)
      const g = groupsRef.current;
      if (g && !inInput && !p.aiOpen && !p.paletteOpen && !p.settingsOpen) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const urls = flattenBookmarkUrls(g);
          if (urls[num - 1]) {
            window.open(urls[num - 1], "_blank");
            return;
          }
        }
      }
      if (e.key === "Escape") {
        if (p.aiOpen) { a.setAiOpen(false); return; }
        if (p.paletteOpen) { a.setPaletteOpen(false); return; }
        if (p.settingsOpen) { a.setSettingsOpen(false); return; }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
}
