"use client";

import { useState } from "react";
import type { WidgetConfig } from "@/types/config";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { GreetingWidget } from "@/components/widgets/GreetingWidget";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { ResourcesWidget } from "@/components/widgets/ResourcesWidget";
import { LogoWidget } from "@/components/widgets/LogoWidget";
import { mutate as mutateApi } from "@/lib/mutate";

interface WidgetRowProps {
  widgets: WidgetConfig[];
  editMode: boolean;
  onConfigChange: () => void;
}

export function WidgetRow({ widgets, editMode, onConfigChange }: WidgetRowProps) {
  if (widgets.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {widgets.map((w, i) => (
        <WidgetRenderer
          key={`${w.type}-${i}`}
          widget={w}
          index={i}
          editMode={editMode}
          onConfigChange={onConfigChange}
        />
      ))}
      {editMode && <AddWidgetButton onConfigChange={onConfigChange} />}
    </div>
  );
}

interface WidgetRendererProps {
  widget: WidgetConfig;
  index: number;
  editMode: boolean;
  onConfigChange: () => void;
}

export function WidgetRenderer({ widget, index, editMode, onConfigChange }: WidgetRendererProps) {
  const widgetEl = (() => {
    switch (widget.type) {
      case "datetime":
        return <ClockWidget config={widget.config} />;
      case "greeting":
        return <GreetingWidget config={widget.config} />;
      case "weather":
        return <WeatherWidget config={widget.config} onConfigChange={onConfigChange} />;
      case "resources":
        return <ResourcesWidget config={widget.config} />;
      case "logo":
        return <LogoWidget config={widget.config} />;
      default:
        return null;
    }
  })();

  if (!widgetEl) return null;

  if (!editMode) return widgetEl;

  return (
    <div className="relative group/edit">
      {widgetEl}
      <button
        onClick={() => removeWidget(index, onConfigChange)}
        title="Remove widget"
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white border-2 border-surface text-[0.65rem] cursor-pointer flex items-center justify-center leading-none opacity-0 group-hover/edit:opacity-100 transition-opacity duration-150 hover:scale-110"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

const widgetTypes = [
  { value: "datetime", label: "Clock", icon: "🕐" },
  { value: "greeting", label: "Greeting", icon: "👋" },
  { value: "weather", label: "Weather", icon: "🌤" },
  { value: "resources", label: "System", icon: "📊" },
  { value: "logo", label: "Logo", icon: "🖼" },
] as const;

function AddWidgetButton({ onConfigChange }: { onConfigChange: () => void }) {
  const handleAdd = async (type: string) => {
    const result = await mutateApi("add_widget", { type, config: {} });
    if (result) onConfigChange();
  };

  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="bg-transparent border border-dashed border-border rounded-xl px-4 py-2.5 cursor-pointer text-[0.875rem] text-text-secondary transition-colors duration-150 hover:border-accent hover:text-accent hover:bg-accent-soft"
      >
        + Add Widget
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center animate-[fadeIn_0.15s_ease]">
      {widgetTypes.map((t) => (
        <button
          key={t.value}
          onClick={() => { handleAdd(t.value); setExpanded(false); }}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 cursor-pointer text-[0.8rem] text-text transition-all duration-150 hover:bg-surface-hover hover:border-border-hover"
        >
          {t.label}
        </button>
      ))}
      <button
        onClick={() => setExpanded(false)}
        className="bg-transparent border border-border rounded-lg px-2.5 py-1.5 cursor-pointer text-[0.8rem] text-text-secondary transition-all duration-150 hover:bg-surface-hover"
      >
        Cancel
      </button>
    </div>
  );
}

async function removeWidget(index: number, onConfigChange: () => void) {
  const result = await mutateApi("remove_widget", { index });
  if (result) onConfigChange();
}
