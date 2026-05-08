"use client";

import { mutate } from "@/lib/mutate";

interface ThemeToggleProps {
  theme: string;
  onChange: () => void;
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const next = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
  const label = theme === "auto" ? "Auto" : theme === "light" ? "Light" : "Dark";

  const handleClick = async () => {
    const result = await mutate("change_theme", { theme: next });
    if (result) {
      document.documentElement.setAttribute("data-theme", next);
      onChange();
    }
  };

  return (
    <button
      onClick={handleClick}
      title={`Switch to ${next} mode`}
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "4px 10px",
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 500,
        color: "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}
