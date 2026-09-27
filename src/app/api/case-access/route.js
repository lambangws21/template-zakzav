import { randomBytes, timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/serverAuth";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { CASE_ACCESS_COOKIE, CASE_ACCESS_TTL, caseAccessRef, hashCaseToken, requireCaseAccess, signCaseToken, getCaseAccessSecret } from "@/lib/caseAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accessErrorResponse(error) {
  const missingConfig = error?.code === "CASE_ACCESS_CONFIG_MISSING";
  // Only report a classification, never the PIN, token, or raw SDK error.
  console.error("[case-access]", missingConfig ? "configuration_missing" : "verification_unavailable");
  return NextResponse.json({
    ok: false,
    code: missingConfig ? "CASE_ACCESS_CONFIG_MISSING" : "CASE_ACCESS_UNAVAILABLE",
    error: missingConfig
      ? "Konfigurasi akses Kasusku belum lengkap. Set CASE_ACCESS_SECRET di server lalu deploy ulang."
      : "Layanan akses Kasusku belum tersedia. Periksa konfigurasi Firebase Admin dan akses Firestore di server; ini bukan kesalahan kode PIN.",
  }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  try {
    const auth = await requireApprovedUser(request);
    if (auth.error) return auth.error;
    getCaseAccessSecret();
    return await requireCaseAccess(request, auth.user.uid) || NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return accessErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    const auth = await requireApprovedUser(request);
    if (auth.error) return auth.error;
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload.code !== "string" || payload.code.length > 128) {
      return NextResponse.json({ ok: false, error: "Format kode akses tidak valid." }, { status: 400 });
    }
    const expected = Buffer.from(String(process.env.CASE_ACCESS_CODE || "").trim() || "2026");
    const provided = Buffer.from(payload.code.trim());
    const valid = provided.length === expected.length && timingSafeEqual(provided, expected);
    const token = randomBytes(32).toString("hex");
    const signedToken = `${token}.${signCaseToken(token, auth.user.uid)}`;
    const ref = caseAccessRef(auth.user.uid);
    // Persist the attempt limit across serverless instances, not in process memory.
    const result = await getFirestore(getFirebaseAdminApp()).runTransaction(async (tx) => {
      const state = (await tx.get(ref)).data() || {};
      const now = Date.now();
      if (state.blockedUntil > now) return 429;
      if (!valid) {
        const attempts = state.windowUntil > now ? (state.attempts || 0) + 1 : 1;
        tx.set(ref, { attempts, windowUntil: now + 15 * 60_000, blockedUntil: attempts >= 5 ? now + 15 * 60_000 : 0 }, { merge: true });
        return attempts >= 5 ? 429 : 403;
      }
      tx.set(ref, { tokenHash: hashCaseToken(token), expiresAt: now + CASE_ACCESS_TTL * 1000, attempts: 0, windowUntil: 0, blockedUntil: 0 });
      return 200;
    });
    if (result !== 200) return NextResponse.json({ ok: false, error: result === 429 ? "Terlalu banyak percobaan. Coba lagi dalam 15 menit." : "Kode akses salah." }, { status: result });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(CASE_ACCESS_COOKIE, signedToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: CASE_ACCESS_TTL });
    return response;
  } catch (error) {
    return accessErrorResponse(error);
  }
}
