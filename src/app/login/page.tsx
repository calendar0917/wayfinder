"use client";

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-bg">
      <div className="bg-card border border-border rounded-xl p-8 w-[300px] shadow-card-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">
          Login
        </h2>
        <LoginForm onSuccess={() => { window.location.href = "/"; }} />
      </div>
    </div>
  );
}
