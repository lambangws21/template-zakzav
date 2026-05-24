import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secureEquals(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function getAdminCode() {
  const code = String(process.env.CHECKLIST_ADMIN_CODE || "").trim();
  if (!code) {
    throw new Error("CHECKLIST_ADMIN_CODE belum diset di environment.");
  }
  return code;
}

export async function GET() {
  const configured = Boolean(String(process.env.CHECKLIST_ADMIN_CODE || "").trim());
  return NextResponse.json(
    {
      ok: configured,
      configured,
      message: configured
        ? "Admin code configured."
        : "Set CHECKLIST_ADMIN_CODE in .env.local.",
    },
    { status: configured ? 200 : 500 }
  );
}

export async function POST(req) {
  try {
    const expectedCode = getAdminCode();
    const body = await req.json().catch(() => ({}));
    const inputCode = String(body?.code || "").trim();

    if (!inputCode) {
      return NextResponse.json(
        { ok: false, authorized: false, error: "Kode akses wajib diisi." },
        { status: 400 }
      );
    }

    const authorized = secureEquals(inputCode, expectedCode);
    if (!authorized) {
      return NextResponse.json(
        { ok: false, authorized: false, error: "Kode akses salah." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: true, authorized: true, message: "Akses diizinkan." },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authorized: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
