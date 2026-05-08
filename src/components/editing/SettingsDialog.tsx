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
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[200]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-[440px] max-h-[80vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-center py-4 px-5 border-b border-border">
          <h2 className="text-base font-semibold m-0">Settings</h2>
          <button onClick={onClose} className="bg-transparent text-text-secondary cursor-pointer text-base font-semibold p-0">x</button>
        </div>

        <div className="py-4 px-5 flex flex-col gap-2.5">
          <h3 className="text-[0.85rem] font-semibold m-0 text-text-secondary uppercase tracking-wider">AI Configuration</h3>
          <label className="flex flex-col gap-1 text-[0.8rem] font-medium text-text-secondary">
            API Key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentApiKey === "***" ? "Leave empty to keep current" : "Enter API key"}
              className="w-full py-2 px-2.5 bg-bg-secondary border border-border rounded-md text-[0.85rem] text-text outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.8rem] font-medium text-text-secondary">
            API Base URL
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full py-2 px-2.5 bg-bg-secondary border border-border rounded-md text-[0.85rem] text-text outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.8rem] font-medium text-text-secondary">
            Model
            <input
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full py-2 px-2.5 bg-bg-secondary border border-border rounded-md text-[0.85rem] text-text outline-none"
            />
          </label>
          <button onClick={handleSaveAI} disabled={saving} className="bg-accent text-white rounded-md py-2 px-4 cursor-pointer text-[0.85rem] font-medium mt-1">
            {saving ? "Saving..." : "Save AI Settings"}
          </button>
        </div>

        <div className="py-4 px-5 flex flex-col gap-2.5">
          <h3 className="text-[0.85rem] font-semibold m-0 text-text-secondary uppercase tracking-wider">Password Protection</h3>
          <p className="text-[0.8rem] text-text-secondary m-0 leading-[1.5]">
            Set a password to require login before accessing the dashboard.
          </p>
          <label className="flex flex-col gap-1 text-[0.8rem] font-medium text-text-secondary">
            New Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 4 characters"
              className="w-full py-2 px-2.5 bg-bg-secondary border border-border rounded-md text-[0.85rem] text-text outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[0.8rem] font-medium text-text-secondary">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full py-2 px-2.5 bg-bg-secondary border border-border rounded-md text-[0.85rem] text-text outline-none"
            />
          </label>
          <button onClick={handleSetPassword} disabled={saving} className="bg-accent text-white rounded-md py-2 px-4 cursor-pointer text-[0.85rem] font-medium mt-1">
            {saving ? "Saving..." : "Set Password"}
          </button>
        </div>

        {error && <div className="py-2 px-5 text-red-500 text-[0.8rem]">{error}</div>}
        {success && <div className="py-2 px-5 text-green-500 text-[0.8rem]">{success}</div>}
      </div>
    </div>
  );
}
