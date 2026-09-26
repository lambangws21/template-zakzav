import { randomBytes, timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/serverAuth";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { CASE_ACCESS_COOKIE, CASE_ACCESS_TTL, caseAccessRef, hashCaseToken, requireCaseAccess, signCaseToken } from "@/lib/caseAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireApprovedUser(request);
    if (auth.error) return auth.error;
    return await requireCaseAccess(request, auth.user.uid) || NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Akses belum dapat diverifikasi." }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireApprovedUser(request);
    if (auth.error) return auth.error;
    const { code } = await request.json();
    const expected = Buffer.from(process.env.CASE_ACCESS_CODE || "2026");
    const provided = Buffer.from(typeof code === "string" ? code.slice(0, 128) : "");
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
  } catch {
    return NextResponse.json({ ok: false, error: "Kode akses belum dapat diverifikasi." }, { status: 503 });
  }
}
