import { execFileSync } from "child_process";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");

export function gitCommit(message: string): void {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "pipe" });
  } catch {
    return; // not a git repo — skip commit
  }
  try {
    const status = execFileSync("git", ["-C", DATA_DIR, "status", "--porcelain"], {
      encoding: "utf-8",
    });
    if (!status.trim()) return;
    execFileSync("git", ["-C", DATA_DIR, "add", "."], { stdio: "pipe" });
    execFileSync("git", ["-C", DATA_DIR, "commit", "-m", message], {
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
