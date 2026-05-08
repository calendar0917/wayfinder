import { NextResponse } from "next/server";
import { readConfigSafe } from "@/lib/config";

export async function GET() {
  const config = readConfigSafe();
  return NextResponse.json(config);
}
