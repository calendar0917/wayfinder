import os from "fs";
import { platform } from "os";

interface CPUStats {
  percent: number;
}

interface MemoryStats {
  total: number;
  used: number;
  free: number;
  percent: number;
}

interface UptimeStats {
  seconds: number;
  formatted: string;
}

interface CPUTempStats {
  celsius: number | null;
}

interface SystemResources {
  cpu: CPUStats;
  memory: MemoryStats;
  uptime: UptimeStats;
  cpuTemp: CPUTempStats;
}

let cachedResources: SystemResources | null = null;
let lastFetch = 0;
const CACHE_TTL = 3000;

let prevIdle = 0;
let prevTotal = 0;

// Cross-platform: use os module for memory and uptime
function readCPU(): CPUStats {
  const plat = platform();
  if (plat === "linux") {
    try {
      const fs = require("fs");
      const stat = fs.readFileSync("/proc/stat", "utf-8");
      const parts = stat.split("\n")[0].split(/\s+/).slice(1).map(Number);
      const idle = parts[3] + parts[4];
      const total = parts.reduce((a: number, b: number) => a + b, 0);
      const diffIdle = idle - prevIdle;
      const diffTotal = total - prevTotal;
      prevIdle = idle;
      prevTotal = total;
      const percent = diffTotal === 0 ? 0 : (1 - diffIdle / diffTotal) * 100;
      return { percent: Math.round(percent * 10) / 10 };
    } catch {
      return { percent: 0 };
    }
  }
  // macOS / Windows: use os.cpus() for approximate CPU usage
  try {
    const cpus = require("os").cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type of ["idle", "user", "nice", "sys", "irq"] as const) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }
    const diffIdle = idle - prevIdle;
    const diffTotal = total - prevTotal;
    prevIdle = idle;
    prevTotal = total;
    const percent = diffTotal === 0 ? 0 : (1 - diffIdle / diffTotal) * 100;
    return { percent: Math.round(percent * 10) / 10 };
  } catch {
    return { percent: 0 };
  }
}

function readMemory(): MemoryStats {
  try {
    const osModule = require("os");
    const total = osModule.totalmem();
    const free = osModule.freemem();
    const used = total - free;
    const percent = total === 0 ? 0 : (used / total) * 100;
    return { total, used, free, percent: Math.round(percent * 10) / 10 };
  } catch {
    return { total: 0, used: 0, free: 0, percent: 0 };
  }
}

function readUptime(): UptimeStats {
  try {
    const osModule = require("os");
    const seconds = Math.floor(osModule.uptime());
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return { seconds, formatted: parts.join(" ") };
  } catch {
    return { seconds: 0, formatted: "0m" };
  }
}

function readCPUTemp(): CPUTempStats {
  const plat = platform();
  if (plat === "linux") {
    try {
      const fs = require("fs");
      const temp = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf-8");
      return { celsius: parseInt(temp.trim(), 10) / 1000 };
    } catch {
      return { celsius: null };
    }
  }
  // CPU temp not easily available cross-platform without native deps
  return { celsius: null };
}

export function getSystemResources(): SystemResources {
  const now = Date.now();
  if (cachedResources && now - lastFetch < CACHE_TTL) {
    return cachedResources;
  }
  cachedResources = {
    cpu: readCPU(),
    memory: readMemory(),
    uptime: readUptime(),
    cpuTemp: readCPUTemp(),
  };
  lastFetch = now;
  return cachedResources;
}
