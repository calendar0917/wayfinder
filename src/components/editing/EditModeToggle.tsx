"use client";

interface EditModeToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export function EditModeToggle({ enabled, onToggle }: EditModeToggleProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 ${
        enabled
          ? "bg-accent-soft text-accent border border-accent"
          : "bg-surface-alt text-text-secondary border border-border hover:bg-surface-hover hover:border-border-hover"
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
      {enabled ? "Editing" : "Edit"}
    </button>
  );
}
