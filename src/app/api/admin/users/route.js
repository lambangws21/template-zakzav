import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (admin.error) return admin.error;

  try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const authUsers = [];
    let pageToken;

    do {
      const page = await auth.listUsers(1000, pageToken);
      authUsers.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken && authUsers.length < 5000);

    const refs = authUsers.map((user) => firestore.collection("users").doc(user.uid));
    const snapshots = refs.length ? await firestore.getAll(...refs) : [];
    const profiles = new Map(
      snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => [snapshot.id, snapshot.data()]),
    );

    const users = authUsers
      .map((user) => {
        const profile = profiles.get(user.uid) || {};
        return {
          uid: user.uid,
          email: user.email || profile.email || "",
          displayName: user.displayName || profile.displayName || "",
          status: String(profile.status || "pending").toLowerCase(),
          disabled: Boolean(user.disabled),
          emailVerified: Boolean(user.emailVerified),
          createdAt: serializeDate(profile.createdAt) || user.metadata.creationTime || null,
          lastSignInAt: user.metadata.lastSignInTime || null,
          reviewedAt: serializeDate(profile.reviewedAt || profile.approvedAt),
        };
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return NextResponse.json({ ok: true, users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-users:list]", error);
    return NextResponse.json({ ok: false, error: "Gagal memuat daftar akun." }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (admin.error) return admin.error;

  try {
    const body = await request.json().catch(() => ({}));
    const uid = String(body?.uid || "").trim();
    const status = String(body?.status || "").trim().toLowerCase();
    if (!uid || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ ok: false, error: "UID atau status tidak valid." }, { status: 400 });
    }

    const app = getFirebaseAdminApp();
    const target = await getAuth(app).getUser(uid);
    await getFirestore(app).collection("users").doc(uid).set(
      {
        uid,
        email: target.email || "",
        status,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: admin.user.email || admin.user.uid,
        ...(status === "approved" ? { approvedAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, uid, status });
  } catch (error) {
    console.error("[admin-users:update]", error);
    return NextResponse.json({ ok: false, error: "Gagal memperbarui status akun." }, { status: 500 });
  }
}
