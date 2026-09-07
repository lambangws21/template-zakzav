import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";

const ADMIN_COOKIE = "zakzav_admin";
const ADMIN_TTL_SECONDS = 30 * 60;

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ""), "utf8");
  const right = Buffer.from(String(rightValue || ""), "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function adminSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || process.env.APPROVAL_SECRET || "").trim();
}

export async function requireUser(request) {
  const app = getFirebaseAdminApp();
  if (!app) {
    return { error: NextResponse.json({ ok: false, error: "Firebase Admin belum dikonfigurasi." }, { status: 503 }) };
  }
  const authorization = String(request.headers.get("authorization") || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: NextResponse.json({ ok: false, error: "Autentikasi diperlukan." }, { status: 401 }) };
  }
  try {
    const user = await getAuth(app).verifyIdToken(match[1], true);
    return { user };
  } catch {
    return { error: NextResponse.json({ ok: false, error: "Sesi tidak valid atau kedaluwarsa." }, { status: 401 }) };
  }
}

export async function requireApprovedUser(request) {
  const result = await requireUser(request);
  if (result.error) return result;
  try {
    const app = getFirebaseAdminApp();
    const snapshot = await getFirestore(app)
      .collection("users")
      .doc(result.user.uid)
      .get();
    const status = String(snapshot.data()?.status || "").trim().toLowerCase();
    if (!snapshot.exists || status !== "approved") {
      return {
        error: NextResponse.json(
          { ok: false, error: "Akun belum disetujui administrator." },
          { status: 403 },
        ),
      };
    }
    return { ...result, profile: snapshot.data() };
  } catch {
    return {
      error: NextResponse.json(
        { ok: false, error: "Status persetujuan akun tidak dapat diverifikasi." },
        { status: 503 },
      ),
    };
  }
}

export function createAdminSession(uid) {
  const secret = adminSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET atau APPROVAL_SECRET belum diset.");
  const expires = Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS;
  const payload = `${uid}.${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return { value: `${payload}.${signature}`, maxAge: ADMIN_TTL_SECONDS };
}

export function hasValidAdminSession(request, uid) {
  const secret = adminSecret();
  const raw = request.cookies.get(ADMIN_COOKIE)?.value || "";
  const [cookieUid, expiresRaw, signature] = raw.split(".");
  const expires = Number(expiresRaw);
  if (!secret || !cookieUid || !signature || cookieUid !== uid || !Number.isFinite(expires)) return false;
  if (expires < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", secret).update(`${cookieUid}.${expiresRaw}`).digest("hex");
  return safeEqual(signature, expected);
}

export async function requireAdmin(request) {
  const result = await requireApprovedUser(request);
  if (result.error) return result;
  if (!hasValidAdminSession(request, result.user.uid)) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Otorisasi admin diperlukan." },
        { status: 403 },
      ),
    };
  }
  return result;
}

export const adminCookieName = ADMIN_COOKIE;
