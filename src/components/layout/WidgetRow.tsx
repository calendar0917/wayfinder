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
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 24,
      }}
    >
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
        return <WeatherWidget config={widget.config} />;
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
    <div style={{ position: "relative" }}>
      {widgetEl}
      <button
        onClick={() => removeWidget(index, onConfigChange)}
        title="Remove widget"
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#dc2626",
          color: "white",
          border: "none",
          fontSize: "0.65rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
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
        style={{
          background: "none",
          border: "1px dashed var(--border)",
          borderRadius: 8,
          padding: "10px 16px",
          cursor: "pointer",
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
        }}
      >
        + Add Widget
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      {(["datetime", "greeting", "weather", "resources", "logo"] as const).map((type) => (
        <button
          key={type}
          onClick={() => { handleAdd(type); setExpanded(false); }}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: "0.8rem",
            color: "var(--text)",
          }}
        >
          {type}
        </button>
      ))}
      <button
        onClick={() => setExpanded(false)}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "6px 10px",
          cursor: "pointer",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
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
