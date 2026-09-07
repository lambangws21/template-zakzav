import { createHmac, timingSafeEqual } from "crypto";
import { getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(req) {
  return handleApproval(new URL(req.url).searchParams, false);
}

export async function POST(req) {
  const form = await req.formData().catch(() => null);
  const params = new URLSearchParams();
  if (form) {
    for (const key of ["uid", "token", "expires"]) {
      params.set(key, String(form.get(key) || ""));
    }
  }
  return handleApproval(params, true);
}

async function handleApproval(searchParams, confirmed) {
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const expiresRaw = searchParams.get("expires");
  const expires = Number(expiresRaw);

  if (!uid || !token || !Number.isFinite(expires)) {
    return new Response(errorHtml("Parameter tidak lengkap."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Verifikasi token HMAC
  const secret = String(process.env.APPROVAL_SECRET || "").trim();
  if (!secret) {
    return new Response(errorHtml("Konfigurasi approval belum tersedia."), { status: 503, headers: { "Content-Type": "text/html" } });
  }
  const expected = createHmac("sha256", secret).update(`${uid}.${expiresRaw}`).digest("hex");
  const suppliedBuffer = Buffer.from(token, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const validToken = suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!validToken || expires < Math.floor(Date.now() / 1000)) {
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

  if (!confirmed) {
    return new Response(
      confirmationHtml({ uid, token, expires: expiresRaw, email: userData.email }),
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  }

  await userRef.update({ status: "approved", approvedAt: new Date() });

  return new Response(successHtml(userData.email, false), {
    headers: { "Content-Type": "text/html" },
  });
}

function confirmationHtml({ uid, token, expires, email }) {
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Konfirmasi Persetujuan</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;">
  <main style="text-align:center;max-width:440px;padding:32px;background:#1e293b;border-radius:20px;">
    <h2 style="color:#22d3ee;margin:0 0 12px">Konfirmasi Persetujuan Akun</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">Setujui akses untuk <strong style="color:#e2e8f0">${escapeHtml(email)}</strong>?</p>
    <form method="post" style="margin-top:22px">
      <input type="hidden" name="uid" value="${escapeHtml(uid)}">
      <input type="hidden" name="expires" value="${escapeHtml(expires)}">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit" style="border:0;border-radius:12px;background:#22d3ee;color:#0f172a;font-weight:800;padding:12px 24px;cursor:pointer">Setujui Akun</button>
    </form>
    <p style="color:#64748b;font-size:11px;margin-top:18px">Akun belum berubah sampai tombol konfirmasi ditekan.</p>
  </main>
</body>
</html>`;
}

function successHtml(email, alreadyApproved) {
  const safeEmail = escapeHtml(email);
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Akses Disetujui</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0;">
  <div style="text-align:center;max-width:400px;padding:32px;background:#1e293b;border-radius:20px;">
    <div style="font-size:48px;margin-bottom:16px;">${alreadyApproved ? "✅" : "🎉"}</div>
    <h2 style="color:#22d3ee;margin:0 0 12px">${alreadyApproved ? "Sudah Disetujui" : "Akses Diberikan!"}</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 8px">
	      ${alreadyApproved ? "Akun ini sebelumnya sudah disetujui." : `Akun <strong style='color:#e2e8f0'>${safeEmail}</strong> kini dapat mengakses aplikasi.`}
    </p>
    <p style="color:#475569;font-size:12px;margin:16px 0 0">Kamu bisa tutup halaman ini.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
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
