"use client";

import { ReactNode } from "react";

interface WidgetCardProps {
  children: ReactNode;
  className?: string;
}

export default function WidgetCard({ children, className = "" }: WidgetCardProps) {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-150 min-w-[160px] ${className}`}
    >
      {children}
    </div>
  );
}
