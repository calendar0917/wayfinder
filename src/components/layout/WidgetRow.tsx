"use client";

import type { WidgetConfig } from "@/types/config";
import ClockWidget from "@/components/widgets/ClockWidget";
import GreetingWidget from "@/components/widgets/GreetingWidget";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import ResourcesWidget from "@/components/widgets/ResourcesWidget";
import LogoWidget from "@/components/widgets/LogoWidget";
import NotesWidget from "@/components/widgets/NotesWidget";
import SearchWidget from "@/components/widgets/SearchWidget";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

interface WidgetRowProps {
  widgets: WidgetConfig[];
  title: string;
  editMode?: boolean;
  onRemoveWidget?: (index: number) => void;
  onAddWidget?: () => void;
  onConfigUpdate?: () => void;
}

const widgetComponents: Record<string, React.ComponentType<any>> = {
  datetime: ClockWidget,
  greeting: GreetingWidget,
  weather: WeatherWidget,
  resources: ResourcesWidget,
  logo: LogoWidget,
  notes: NotesWidget,
  search: SearchWidget,
};

export default function WidgetRow({ widgets, title, editMode, onRemoveWidget, onAddWidget, onConfigUpdate }: WidgetRowProps) {
  if (!widgets.length) return null;

  return (
    <div className="flex flex-wrap gap-4 stagger-item">
      {widgets.map((widget, i) => {
        const Widget = widgetComponents[widget.type];
        if (!Widget) return null;
        return (
          <ErrorBoundary key={`${widget.type}-${i}`}>
            <div className="relative group">
              {widget.type === "greeting" ? (
                <GreetingWidget title={title} />
              ) : widget.type === "datetime" ? (
                <ClockWidget config={widget.config} />
              ) : widget.type === "weather" ? (
                <WeatherWidget config={widget.config as import("@/types/config").WeatherConfig} widgetIndex={i} onConfigUpdate={onConfigUpdate} />
              ) : (
                <Widget config={widget.config} />
              )}
              {editMode && onRemoveWidget && (
                <button
                  onClick={() => onRemoveWidget(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--error)] text-white border-none rounded-full text-xs flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-[var(--shadow-sm)]"
                  title="Remove widget"
                >
                  ×
                </button>
              )}
            </div>
          </ErrorBoundary>
        );
      })}
      {editMode && onAddWidget && (
        <button
          onClick={onAddWidget}
          className="flex items-center justify-center min-w-[160px] min-h-[80px] bg-[var(--surface-alt)] border-2 border-dashed border-[var(--border)] rounded-[var(--radius-md)] text-sm text-[var(--text-tertiary)] cursor-pointer transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          + Widget
        </button>
      )}
    </div>
  );
}
