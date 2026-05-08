import { NextResponse } from "next/server";
import { getSystemResources } from "@/lib/system-resources";

export async function GET() {
  const resources = getSystemResources();
  return NextResponse.json(resources);
}
