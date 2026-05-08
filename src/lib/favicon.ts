export function getFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return "";
  }
}

export function getLetterAvatar(name: string): string {
  const letter = (name || "?")[0].toUpperCase();
  const colors = [
    "#4c6ef5", "#f59f00", "#40c057", "#fa5252", "#7950f2",
    "#fd7e14", "#15aabf", "#e64980", "#12b886", "#5c7cfa",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  // Return an SVG data URI for a letter avatar
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${color}"/><text x="16" y="22" font-family="system-ui,sans-serif" font-size="16" font-weight="600" text-anchor="middle" fill="white">${letter}</text></svg>`
  )}`;
}
