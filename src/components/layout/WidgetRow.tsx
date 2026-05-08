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

export default function WidgetRow({ widgets, title }: WidgetRowProps) {
  if (!widgets.length) return null;

  return (
    <div className="flex flex-wrap gap-4 stagger-item">
      {widgets.map((widget, i) => {
        const Widget = widgetComponents[widget.type];
        if (!Widget) return null;
        return (
          <ErrorBoundary key={i}>
            {widget.type === "greeting" ? (
              <GreetingWidget title={title} />
            ) : widget.type === "datetime" ? (
              <ClockWidget config={widget.config} />
            ) : (
              <Widget />
            )}
          </ErrorBoundary>
        );
      })}
    </div>
  );
}
