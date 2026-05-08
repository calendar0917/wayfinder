"use client";

interface EditModeToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export function EditModeToggle({ enabled, onToggle }: EditModeToggleProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`rounded-md px-3 py-1 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 ${enabled ? "bg-accent text-white border border-accent" : "bg-bg-secondary text-text-secondary border border-border"}`}
    >
      {enabled ? "Editing" : "Edit"}
    </button>
  );
}
