import { execFileSync } from "child_process";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "data");

// In development, git commits trigger Next.js HMR crashes.
// Defer commits to a background process or skip them entirely.
const SKIP_GIT_COMMIT = process.env.NODE_ENV === "development";

let commitQueue: string[] = [];

function doGitCommit(messages: string[]): void {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "pipe" });
  } catch {
    return;
  }
  try {
    const status = execFileSync("git", ["-C", DATA_DIR, "status", "--porcelain"], {
      encoding: "utf-8",
    });
    if (!status.trim()) return;
    execFileSync("git", ["-C", DATA_DIR, "add", "."], { stdio: "pipe" });
    const msg = messages.length === 1 ? messages[0] : `batch: ${messages.length} edits`;
    execFileSync("git", ["-C", DATA_DIR, "commit", "-m", msg], {
      stdio: "pipe",
    });
  } catch {
    // best-effort commit
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function gitCommit(message: string): void {
  if (SKIP_GIT_COMMIT) return;
  commitQueue.push(message);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const batch = commitQueue.slice();
    commitQueue = [];
    flushTimer = null;
    doGitCommit(batch);
  }, 3000);
}

export function flushGitCommits(): void {
  if (commitQueue.length === 0) return;
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  const batch = commitQueue.slice();
  commitQueue = [];
  doGitCommit(batch);
}

export function gitLog(limit = 20): Array<{
  hash: string;
  message: string;
  date: string;
}> {
  try {
    const output = execFileSync(
      "git",
      ["-C", DATA_DIR, "log", "--oneline", "--max-count", String(limit), "--format=%H||%s||%aI"],
      { encoding: "utf-8" }
    );
    return output
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, message, date] = line.split("||");
        return { hash: hash.slice(0, 7), message, date };
      });
  } catch {
    return [];
  }
}
