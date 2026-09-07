import { createHmac } from "crypto";
import nodemailer from "nodemailer";
import { requireUser } from "@/lib/serverAuth";

const attempts = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;

function canSend(uid) {
  const now = Date.now();
  const previous = attempts.get(uid) || 0;
  if (now - previous < RATE_WINDOW_MS) return false;
  attempts.set(uid, now);
  return true;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export async function POST(req) {
  try {
    const authResult = await requireUser(req);
    if (authResult.error) return authResult.error;
    const uid = authResult.user.uid;
    const email = authResult.user.email;
    if (!email || !canSend(uid)) {
      return Response.json({ ok: false, error: "Permintaan notifikasi dibatasi." }, { status: 429 });
    }

    const secret = String(process.env.APPROVAL_SECRET || "").trim();
    if (!secret) throw new Error("APPROVAL_SECRET belum diset.");
    const expires = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const token = createHmac("sha256", secret).update(`${uid}.${expires}`).digest("hex");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const approveUrl = `${appUrl}/api/approve-user?uid=${encodeURIComponent(uid)}&expires=${expires}&token=${token}`;
    const safeEmail = escapeHtml(email);
    const safeUid = escapeHtml(uid);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"ZakZav App" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[ZakZav] Permintaan akses baru: ${email.replace(/[\r\n]/g, "")}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
          <h2 style="color:#22d3ee;margin-top:0">Permintaan Akses Baru</h2>
          <p style="color:#94a3b8;font-size:14px;">Ada pengguna baru yang mendaftar dan menunggu persetujuan kamu.</p>
          <div style="background:#1e293b;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Email</p>
            <p style="margin:0;font-weight:600;color:#e2e8f0;">${safeEmail}</p>
            <p style="margin:12px 0 6px;font-size:12px;color:#64748b;">UID</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;word-break:break-all;">${safeUid}</p>
          </div>
          <a href="${approveUrl}" style="display:inline-block;background:#22d3ee;color:#0f172a;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none;margin-top:8px;">
            ✓ Setujui Akses
          </a>
          <p style="margin-top:20px;font-size:11px;color:#475569;">
            Kalau bukan kamu yang harusnya menyetujui ini, abaikan email ini saja.
          </p>
        </div>
      `,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[notify-admin]", err.message);
    return Response.json({ ok: false, error: "Notifikasi gagal dikirim." }, { status: 500 });
  }
}
