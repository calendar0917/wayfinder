import fs from "fs";

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

function readCPU(): CPUStats {
  try {
    const stat = fs.readFileSync("/proc/stat", "utf-8");
    const parts = stat.split("\n")[0].split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + parts[4];
    const total = parts.reduce((a, b) => a + b, 0);
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
    const meminfo = fs.readFileSync("/proc/meminfo", "utf-8");
    const get = (key: string) => {
      const m = meminfo.match(new RegExp(`${key}:\\s+(\\d+)`));
      return m ? parseInt(m[1], 10) * 1024 : 0;
    };
    const total = get("MemTotal");
    const available = get("MemAvailable");
    const used = total - available;
    const percent = total === 0 ? 0 : (used / total) * 100;
    return { total, used, free: available, percent: Math.round(percent * 10) / 10 };
  } catch {
    return { total: 0, used: 0, free: 0, percent: 0 };
  }
}

function readUptime(): UptimeStats {
  try {
    const content = fs.readFileSync("/proc/uptime", "utf-8");
    const seconds = Math.floor(parseFloat(content.split(" ")[0]));
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
  try {
    const temp = fs.readFileSync(
      "/sys/class/thermal/thermal_zone0/temp",
      "utf-8"
    );
    return { celsius: parseInt(temp.trim(), 10) / 1000 };
  } catch {
    return { celsius: null };
  }
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
