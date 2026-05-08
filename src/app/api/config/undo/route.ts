import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readConfigSafe, writeConfig, readConfig } from "@/lib/config";
import { isAuthenticated } from "@/lib/auth";

const execAsync = promisify(exec);

export async function POST() {
  const config = readConfig();
  if (!(await isAuthenticated(config.settings.passwordHash))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the previous commit
    const { stdout } = await execAsync("git log --oneline -2 -- data/settings.yaml", {
      cwd: process.cwd(),
    });
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ error: "No previous commit to undo" }, { status: 400 });
    }
    const prevHash = lines[1].split(" ")[0];

    // Checkout the previous version of settings.yaml
    await execAsync(`git checkout ${prevHash} -- data/settings.yaml`, {
      cwd: process.cwd(),
    });

    // Commit the undo
    await execAsync('git add data/settings.yaml && git commit -m "undo: revert last change"', {
      cwd: process.cwd(),
    });

    return NextResponse.json({ success: true, config: readConfigSafe() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Undo failed" },
      { status: 500 }
    );
  }
}
