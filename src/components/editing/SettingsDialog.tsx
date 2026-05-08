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
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Settings</h2>
          <button onClick={onClose} style={closeBtnStyle}>x</button>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>AI Configuration</h3>
          <label style={labelStyle}>
            API Key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentApiKey === "***" ? "Leave empty to keep current" : "Enter API key"}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            API Base URL
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.openai.com/v1"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Model
            <input
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gpt-4o"
              style={inputStyle}
            />
          </label>
          <button onClick={handleSaveAI} disabled={saving} style={primaryBtnStyle}>
            {saving ? "Saving..." : "Save AI Settings"}
          </button>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Password Protection</h3>
          <p style={hintStyle}>
            Set a password to require login before accessing the dashboard.
          </p>
          <label style={labelStyle}>
            New Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 4 characters"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              style={inputStyle}
            />
          </label>
          <button onClick={handleSetPassword} disabled={saving} style={primaryBtnStyle}>
            {saving ? "Saving..." : "Set Password"}
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 200,
};

const dialogStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  width: 440,
  maxHeight: "80vh",
  overflowY: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderBottom: "1px solid var(--border)",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: 600,
  padding: 0,
};

const sectionStyle: React.CSSProperties = {
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  margin: 0,
  color: "var(--text-secondary)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: "0.8rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.85rem",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: 500,
  marginTop: 4,
};

const hintStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  margin: 0,
  lineHeight: 1.5,
};

const errorStyle: React.CSSProperties = {
  padding: "8px 20px",
  color: "#ef4444",
  fontSize: "0.8rem",
};

const successStyle: React.CSSProperties = {
  padding: "8px 20px",
  color: "#22c55e",
  fontSize: "0.8rem",
};
