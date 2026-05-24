import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = String(searchParams.get("url") || "").trim();
  const driveId = String(searchParams.get("driveId") || "").trim();

  const nextParams = new URLSearchParams();
  if (driveId) nextParams.set("driveId", driveId);
  if (url && !driveId) nextParams.set("src", url);

  const target = `/api/google-drive-image?${nextParams.toString()}`;
  return NextResponse.redirect(new URL(target, request.url), 307);
}
