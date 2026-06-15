import { createHmac } from "crypto";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  if (!uid || !token) {
    return new Response(errorHtml("Parameter tidak lengkap."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Verifikasi token HMAC
  const secret = process.env.APPROVAL_SECRET || "zakzav-default-secret";
  const expected = createHmac("sha256", secret).update(uid).digest("hex");
  if (token !== expected) {
    return new Response(errorHtml("Link tidak valid atau sudah kadaluarsa."), {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Update status di Firestore via Admin SDK
  const adminApp = getFirebaseAdminApp();
  if (!adminApp) {
    return new Response(errorHtml("Konfigurasi Firebase Admin belum diatur."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  const firestore = getFirestore(adminApp);
  const userRef = firestore.collection("users").doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    return new Response(errorHtml("Pengguna tidak ditemukan."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  const userData = snap.data();
  if (userData.status === "approved") {
    return new Response(successHtml(userData.email, true), {
      headers: { "Content-Type": "text/html" },
    });
  }

  await userRef.update({ status: "approved", approvedAt: new Date() });

  return new Response(successHtml(userData.email, false), {
    headers: { "Content-Type": "text/html" },
  });
}

function successHtml(email, alreadyApproved) {
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Akses Disetujui</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;">
  <div style="text-align:center;max-width:400px;padding:32px;background:#1e293b;border-radius:20px;">
    <div style="font-size:48px;margin-bottom:16px;">${alreadyApproved ? "✅" : "🎉"}</div>
    <h2 style="color:#22d3ee;margin:0 0 12px">${alreadyApproved ? "Sudah Disetujui" : "Akses Diberikan!"}</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 8px">
      ${alreadyApproved ? "Akun ini sebelumnya sudah disetujui." : "Akun <strong style='color:#e2e8f0'>${email}</strong> kini dapat mengakses aplikasi."}
    </p>
    <p style="color:#475569;font-size:12px;margin:16px 0 0">Kamu bisa tutup halaman ini.</p>
  </div>
</body>
</html>`.replace("${email}", email);
}

function errorHtml(message) {
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Error</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;">
  <div style="text-align:center;max-width:400px;padding:32px;background:#1e293b;border-radius:20px;">
    <div style="font-size:48px;margin-bottom:16px;">❌</div>
    <h2 style="color:#f87171;margin:0 0 12px">Gagal</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0">${message}</p>
  </div>
</body>
</html>`;
}
