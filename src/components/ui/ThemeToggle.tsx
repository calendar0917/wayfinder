"use client";

import { mutate } from "@/lib/mutate";

interface ThemeToggleProps {
  theme: string;
  onChange: () => void;
}

const icons: Record<string, React.ReactNode> = {
  auto: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  light: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  dark: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
};

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
      className="inline-flex items-center gap-1.5 bg-surface-alt border border-border rounded-lg py-1 px-2.5 cursor-pointer text-[0.8rem] font-medium text-text-secondary transition-all duration-150 hover:bg-surface-hover hover:border-border-hover"
    >
      {icons[theme] || icons.auto}
      {label}
    </button>
  );
}
