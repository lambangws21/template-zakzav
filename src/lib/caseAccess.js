import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";

export const CASE_ACCESS_COOKIE = "zakzav_cases";
export const CASE_ACCESS_TTL = 30 * 60;
export const hashCaseToken = (token) => createHash("sha256").update(token).digest("hex");
export const caseAccessRef = (uid) => getFirestore(getFirebaseAdminApp()).collection("private_case_access").doc(uid);

export function signCaseToken(token, uid) {
  const secret = process.env.CASE_ACCESS_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.APPROVAL_SECRET;
  if (!secret) throw new Error("CASE_ACCESS_SECRET belum dikonfigurasi.");
  return createHmac("sha256", secret).update(`case-access:${uid}:${token}`).digest("hex");
}

export async function requireCaseAccess(request, uid) {
  const [token, signature] = (request.cookies.get(CASE_ACCESS_COOKIE)?.value || "").split(".");
  if (token && /^[a-f0-9]{64}$/.test(token) && /^[a-f0-9]{64}$/.test(signature || "") && timingSafeEqual(Buffer.from(signature), Buffer.from(signCaseToken(token, uid)))) {
    const data = (await caseAccessRef(uid).get()).data();
    if (data?.expiresAt > Date.now() && typeof data.tokenHash === "string") {
      const actual = Buffer.from(hashCaseToken(token));
      const expected = Buffer.from(data.tokenHash);
      if (actual.length === expected.length && timingSafeEqual(actual, expected)) return null;
    }
  }
  return NextResponse.json({ ok: false, error: "Masukkan kode akses Kasusku.", code: "CASE_ACCESS_REQUIRED" }, { status: 403 });
}

export function isPatientCaseAction(action) {
  return /^(list|read|create|update|delete)_?patient_?cases?$/.test(
    String(action || "").trim().toLowerCase().replace(/[\s-]+/g, "_"),
  );
}
