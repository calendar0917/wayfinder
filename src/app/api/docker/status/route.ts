import { NextRequest, NextResponse } from "next/server";
import { readConfig } from "@/lib/config";

interface ContainerStatus {
  name: string;
  state: string;
  status: string;
}

export async function GET(request: NextRequest) {
  try {
    const config = readConfig();

    // Check if Docker socket is available
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
    let containers: ContainerStatus[] = [];

    try {
      const { execFileSync } = await import("child_process");
      const result = execFileSync(
        "curl",
        ["--unix-socket", socketPath, "-s", "http://localhost/containers/json"],
        { timeout: 5000, encoding: "utf-8" }
      );
      const parsed = JSON.parse(result);
      containers = parsed.map((c: { Names?: string[]; State?: string; Status?: string }) => ({
        name: (c.Names?.[0] || "").replace(/^\//, ""),
        state: c.State || "unknown",
        status: c.Status || "",
      }));
    } catch {
      // Docker socket not available or curl failed
      return NextResponse.json({ containers: [], error: "Docker socket unavailable" });
    }

    return NextResponse.json({ containers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Docker status failed" },
      { status: 500 }
    );
  }
}
