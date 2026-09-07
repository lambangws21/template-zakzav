import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminCookieName, createAdminSession, requireApprovedUser } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function attemptKey(req, uid) {
  const forwarded = String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return `${uid}:${forwarded || "unknown"}`;
}

function rateLimitState(key) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    const fresh = { count: 0, startedAt: now };
    attempts.set(key, fresh);
    return fresh;
  }
  return current;
}

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
    const authResult = await requireApprovedUser(req);
    if (authResult.error) return authResult.error;
    const configuredAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const signedInEmail = String(authResult.user.email || "").trim().toLowerCase();
    if (!configuredAdminEmail || signedInEmail !== configuredAdminEmail) {
      return NextResponse.json(
        { ok: false, authorized: false, error: "Akun ini tidak terdaftar sebagai administrator." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    const key = attemptKey(req, authResult.user.uid);
    const rate = rateLimitState(key);
    if (rate.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { ok: false, authorized: false, error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "900" } },
      );
    }
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
      rate.count += 1;
      return NextResponse.json(
        { ok: false, authorized: false, error: "Kode akses salah." },
        { status: 401 }
      );
    }

    attempts.delete(key);

    const session = createAdminSession(authResult.user.uid);
    const response = NextResponse.json(
      { ok: true, authorized: true, message: "Akses diizinkan." },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set(adminCookieName, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
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
