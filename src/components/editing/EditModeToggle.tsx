"use client";

interface EditModeToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export function EditModeToggle({ enabled, onToggle }: EditModeToggleProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      style={{
        background: enabled ? "var(--accent)" : "var(--bg-secondary)",
        color: enabled ? "white" : "var(--text-secondary)",
        border: `1px solid ${enabled ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: "0.8rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {enabled ? "Editing" : "Edit"}
    </button>
  );
}
