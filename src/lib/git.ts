import { execSync } from "child_process";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");

export function gitCommit(message: string): void {
  try {
    execSync("git rev-parse --git-dir 2>/dev/null", { stdio: "pipe" });
  } catch {
    return; // not a git repo — skip commit
  }
  try {
    const status = execSync(`git -C "${DATA_DIR}" status --porcelain`, {
      encoding: "utf-8",
    });
    if (!status.trim()) return;
    execSync(`git -C "${DATA_DIR}" add .`, { stdio: "pipe" });
    execSync(`git -C "${DATA_DIR}" commit -m "${message}"`, {
      stdio: "pipe",
    });
  } catch {
    // best-effort commit
  }
}

export function gitLog(limit = 20): Array<{
  hash: string;
  message: string;
  date: string;
}> {
  try {
    const output = execSync(
      `git -C "${DATA_DIR}" log --oneline --max-count=${limit} --format="%H||%s||%aI" 2>/dev/null`,
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
