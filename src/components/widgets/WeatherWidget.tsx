"use client";

import { useEffect, useState, useCallback } from "react";
import WidgetCard from "@/components/ui/WidgetCard";
import type { WeatherConfig } from "@/types/config";

interface WeatherData {
  temperature: number;
  windspeed: number;
  description: string;
  icon: string;
  location: string;
  units: string;
}

interface WeatherWidgetProps {
  config: WeatherConfig;
  widgetIndex?: number;
  onConfigUpdate?: () => void;
}

export default function WeatherWidget({ config, widgetIndex, onConfigUpdate }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!config.location);
  const [locInput, setLocInput] = useState(config.location || "");
  const [unitsInput, setUnitsInput] = useState(config.units || "metric");

  const fetchWeather = useCallback(async () => {
    if (!config.location) return;
    try {
      const params = new URLSearchParams({ location: config.location });
      if (config.units) params.set("units", config.units);
      const res = await fetch(`/api/weather?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch weather");
        return;
      }
      setWeather(data);
      setError(null);
    } catch {
      setError("Weather unavailable");
    }
  }, [config.location, config.units]);

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, 600000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  async function saveLocation() {
    const loc = locInput.trim();
    if (!loc) return;
    try {
      const res = await fetch("/api/config/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "update_widget_config",
          arguments: { index: widgetIndex ?? 0, config: { location: loc, units: unitsInput } },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditing(false);
        onConfigUpdate?.();
      }
    } catch { /* ignore */ }
  }

  if (!config.location || editing) {
    return (
      <WidgetCard>
        <div className="flex flex-col gap-2 min-w-[180px]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌤</span>
            <span className="text-sm font-semibold text-[var(--text)]">Weather</span>
          </div>
          <input
            value={locInput}
            onChange={(e) => setLocInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveLocation()}
            placeholder="City name (e.g. Tokyo)"
            className="w-full px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-tertiary)]"
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={unitsInput}
              onChange={(e) => setUnitsInput(e.target.value as "metric" | "imperial")}
              className="flex-1 px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text)] outline-none"
            >
              <option value="metric">°C</option>
              <option value="imperial">°F</option>
            </select>
            <button
              onClick={saveLocation}
              disabled={!locInput.trim()}
              className="px-3 py-1.5 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </WidgetCard>
    );
  }

  if (error) {
    return (
      <WidgetCard>
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text)]">{config.location}</span>
            <span className="text-xs text-[var(--text-secondary)]">{error}</span>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="ml-auto p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text)] cursor-pointer bg-transparent border-none"
            title="Change location"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </WidgetCard>
    );
  }

  if (!weather) {
    return (
      <WidgetCard>
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-pulse">⏳</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--text)]">{config.location}</span>
            <span className="text-xs text-[var(--text-tertiary)]">Loading...</span>
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{weather.icon}</span>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-[var(--text)]">
            {Math.round(weather.temperature)}{weather.units === "imperial" ? "°F" : "°C"}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {weather.location} · {weather.description}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {Math.round(weather.windspeed)} {weather.units === "imperial" ? "mph" : "km/h"} wind
          </span>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="ml-auto p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text)] cursor-pointer bg-transparent border-none opacity-0 group-hover:opacity-100 transition-opacity"
          title="Change location"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </WidgetCard>
  );
}
