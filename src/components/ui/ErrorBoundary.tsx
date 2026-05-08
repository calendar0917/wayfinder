"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Widget error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="bg-[var(--error-soft)] border border-[var(--error)] rounded-[var(--radius-md)] p-4 text-sm text-[var(--error)]">
          <p className="font-medium mb-1">Widget failed to render</p>
          <p className="text-xs opacity-80">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
