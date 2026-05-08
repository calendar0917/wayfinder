"use client";

interface EditModeToggleProps {
  active: boolean;
  onToggle: () => void;
}

export default function EditModeToggle({ active, onToggle }: EditModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1.5 text-xs font-medium border rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
          : "bg-[var(--surface-alt)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)]"
      }`}
    >
      {active ? "Editing" : "Edit"}
    </button>
  );
}
