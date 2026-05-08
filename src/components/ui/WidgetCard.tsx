export function WidgetCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card min-w-40 relative">
      {children}
    </div>
  );
}
