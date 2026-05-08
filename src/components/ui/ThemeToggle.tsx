"use client";

type Theme = "auto" | "light" | "dark";

interface ThemeToggleProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export default function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const next = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Auto";

  return (
    <button
      onClick={() => onChange(next as Theme)}
      className="bg-[var(--surface-alt)] text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)]"
      title={`Theme: ${label} — click to switch`}
    >
      {label}
    </button>
  );
}
