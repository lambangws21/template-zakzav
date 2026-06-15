import { createHmac } from "crypto";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { uid, email } = await req.json();

    const secret = process.env.APPROVAL_SECRET || "zakzav-default-secret";
    const token = createHmac("sha256", secret).update(uid).digest("hex");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const approveUrl = `${appUrl}/api/approve-user?uid=${uid}&token=${token}`;

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
      subject: `[ZakZav] Permintaan akses baru: ${email}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
          <h2 style="color:#22d3ee;margin-top:0">Permintaan Akses Baru</h2>
          <p style="color:#94a3b8;font-size:14px;">Ada pengguna baru yang mendaftar dan menunggu persetujuan kamu.</p>
          <div style="background:#1e293b;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Email</p>
            <p style="margin:0;font-weight:600;color:#e2e8f0;">${email}</p>
            <p style="margin:12px 0 6px;font-size:12px;color:#64748b;">UID</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;word-break:break-all;">${uid}</p>
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
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
