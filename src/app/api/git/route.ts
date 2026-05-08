import { NextRequest, NextResponse } from "next/server";
import { gitLog } from "@/lib/git";

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
  const commits = gitLog(limit);
  return NextResponse.json({ commits });
}
