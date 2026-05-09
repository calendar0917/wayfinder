export interface ParsedGroup {
  name: string;
  bookmarks: Array<{ name: string; url: string; tags?: string[] }>;
}

export function parseNetscapeBookmark(html: string): ParsedGroup[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const result: ParsedGroup[] = [];
  const uncategorized: ParsedGroup = { name: "Uncategorized", bookmarks: [] };

  function walkFolder(dl: Element, groupName: string) {
    let group: ParsedGroup | undefined;
    const children = dl.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === "DT") {
        const link = child.querySelector(":scope > A");
        if (link) {
          const name = link.textContent?.trim() || "";
          const url = link.getAttribute("href") || "";
          if (url && !url.startsWith("javascript:")) {
            if (!group) group = { name: groupName, bookmarks: [] };
            group.bookmarks.push({ name, url });
          }
        }
        // Check for nested folder
        const subDl = child.querySelector(":scope > DL");
        if (subDl) {
          const h3 = child.querySelector(":scope > H3");
          const subName = h3?.textContent?.trim() || "Untitled";
          walkFolder(subDl, subName);
        }
      }
    }
    if (group && group.bookmarks.length > 0) {
      result.push(group);
    }
  }

  // Find all top-level DL elements
  const topDls = doc.querySelectorAll("DL");
  for (const dl of topDls) {
    // Only process top-level DLs (those not nested inside another DT)
    if (dl.parentElement?.tagName !== "DT") {
      // Collect bookmarks from this DL that aren't inside a nested folder
      const children = dl.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName === "DT") {
          const h3 = child.querySelector(":scope > H3");
          const link = child.querySelector(":scope > A");

          if (h3) {
            // This is a folder header
            const subDl = child.querySelector(":scope > DL");
            if (subDl) {
              walkFolder(subDl, h3.textContent?.trim() || "Untitled");
            }
          } else if (link) {
            // Top-level bookmark (no folder)
            const name = link.textContent?.trim() || "";
            const url = link.getAttribute("href") || "";
            if (url && !url.startsWith("javascript:")) {
              uncategorized.bookmarks.push({ name, url });
            }
          }
        }
      }
      break; // Only process first top-level DL
    }
  }

  if (uncategorized.bookmarks.length > 0) {
    result.unshift(uncategorized);
  }

  return result;
}
