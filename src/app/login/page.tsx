"use client";

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-bg">
      <div className="bg-surface border border-border rounded-2xl p-8 w-[320px] shadow-lg animate-[modalIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <h2 className="text-[1.25rem] font-bold mb-5 text-center tracking-tight">
          Login
        </h2>
        <LoginForm onSuccess={() => { window.location.href = "/"; }} />
      </div>
    </div>
  );
}
