"use client";

import { useState } from "react";
import { mutate as mutateApi } from "@/lib/mutate";

interface SettingsDialogProps {
  currentApiKey: string;
  currentApiBase: string;
  currentAiModel: string;
  onClose: () => void;
  onConfigChange: () => void;
}

export function SettingsDialog({
  currentApiKey,
  currentApiBase,
  currentAiModel,
  onClose,
  onConfigChange,
}: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState(currentApiKey === "***" ? "" : currentApiKey);
  const [apiBase, setApiBase] = useState(currentApiBase);
  const [aiModel, setAiModel] = useState(currentAiModel);
  const [showApiKey, setShowApiKey] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSaveAI = async () => {
    setSaving(true);
    setError("");
    const args: Record<string, unknown> = { apiBase, aiModel };
    if (apiKey) args.apiKey = apiKey;
    const result = await mutateApi("update_ai_settings", args);
    setSaving(false);
    if (result) {
      setSuccess("AI settings saved");
      onConfigChange();
      setTimeout(() => setSuccess(""), 2000);
    } else {
      setError("Failed to save");
    }
  };

  const handleSetPassword = async () => {
    setError("");
    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    const result = await mutateApi("set_password", { password });
    setSaving(false);
    if (!result) {
      setError("Session expired. Please refresh and try again.");
    } else if (result.success) {
      setSuccess("Password set. New sessions will require login.");
      setPassword("");
      setConfirmPassword("");
      onConfigChange();
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(result.result || "Failed to set password");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[200] animate-[fadeIn_0.15s_ease]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface border border-border rounded-2xl w-[460px] max-md:w-[95vw] max-h-[80vh] overflow-y-auto shadow-lg animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 className="text-[1rem] font-semibold m-0">Settings</h2>
          <button onClick={onClose} className="bg-transparent text-text-tertiary cursor-pointer p-1 rounded-lg transition-colors duration-150 hover:bg-surface-hover hover:text-text-secondary" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="py-5 px-5 flex flex-col gap-3 border-b border-border">
          <h3 className="text-[0.75rem] font-semibold m-0 text-text-tertiary uppercase tracking-wider">AI Configuration</h3>
          <label className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-secondary">
            API Key
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentApiKey === "***" ? "Leave empty to keep current" : "Enter API key"}
                className="w-full py-2 px-2.5 pr-9 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors duration-150 p-0.5"
              >
                {showApiKey ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-secondary">
            API Base URL
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full py-2 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-secondary">
            Model
            <input
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full py-2 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
          <button onClick={handleSaveAI} disabled={saving} className="bg-accent text-white rounded-lg py-2 px-4 cursor-pointer text-[0.85rem] font-medium mt-1 transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
            {saving ? "Saving..." : "Save AI Settings"}
          </button>
        </div>

        <div className="py-5 px-5 flex flex-col gap-3">
          <h3 className="text-[0.75rem] font-semibold m-0 text-text-tertiary uppercase tracking-wider">Password Protection</h3>
          <p className="text-[0.8rem] text-text-secondary m-0 leading-[1.6]">
            Set a password to require login before accessing the dashboard.
          </p>
          <label className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-secondary">
            New Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 4 characters"
              className="w-full py-2 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-secondary">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full py-2 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
          <button onClick={handleSetPassword} disabled={saving} className="bg-accent text-white rounded-lg py-2 px-4 cursor-pointer text-[0.85rem] font-medium mt-1 transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
            {saving ? "Saving..." : "Set Password"}
          </button>
        </div>

        {error && <div className="py-2.5 px-5 text-error text-[0.8rem] bg-error-soft border-t border-border">{error}</div>}
        {success && <div className="py-2.5 px-5 text-success text-[0.8rem] bg-success-soft border-t border-border animate-[fadeIn_0.15s_ease]">{success}</div>}
      </div>
    </div>
  );
}
