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
      localStorage.setItem("homepage-theme", next);
      onChange();
    }
  };

  return (
    <button
      onClick={handleClick}
      title={`Switch to ${next} mode`}
      className="bg-bg-secondary border border-border rounded-md py-1 px-2.5 cursor-pointer text-[0.8rem] font-medium text-text-secondary"
    >
      {label}
    </button>
  );
}
