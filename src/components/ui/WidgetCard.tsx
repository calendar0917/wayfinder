export function WidgetCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 16,
        boxShadow: "var(--shadow)",
        minWidth: 160,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
