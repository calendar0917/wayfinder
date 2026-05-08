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
    <div className="relative">
      {widgetEl}
      <button
        onClick={() => removeWidget(index, onConfigChange)}
        title="Remove widget"
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white border-0 text-[0.65rem] cursor-pointer flex items-center justify-center leading-none"
      >
        x
      </button>
    </div>
  );
}

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
        className="bg-transparent border border-dashed border-border rounded-lg px-4 py-2.5 cursor-pointer text-sm text-text-secondary"
      >
        + Add Widget
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      {(["datetime", "greeting", "weather", "resources", "logo"] as const).map((type) => (
        <button
          key={type}
          onClick={() => { handleAdd(type); setExpanded(false); }}
          className="bg-card border border-border rounded-md px-3 py-1.5 cursor-pointer text-[0.8rem] text-text"
        >
          {type}
        </button>
      ))}
      <button
        onClick={() => setExpanded(false)}
        className="bg-transparent border border-border rounded-md px-2.5 py-1.5 cursor-pointer text-[0.8rem] text-text-secondary"
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
