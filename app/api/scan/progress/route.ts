import { NextRequest } from "next/server";
import { getProgress } from "@/lib/scan-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = (req.nextUrl.searchParams.get("user") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!user) {
    return Response.json({ running: false }, { status: 400 });
  }
  const p = getProgress(user);
  return Response.json({ running: p?.phase === "analyzing" || p?.phase === "fetching", ...p });
}