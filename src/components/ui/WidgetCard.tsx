export function WidgetCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card min-w-40 relative transition-shadow duration-150 hover:shadow-md">
      {children}
    </div>
  );
}
