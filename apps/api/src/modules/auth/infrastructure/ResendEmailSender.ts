import type { EmailSender } from "../domain/ports";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout(heading: string, body: string, link: string, button: string) {
  const href = escapeHtml(link);
  return `<!doctype html><html lang="id"><body style="margin:0;padding:24px;background:#f6f4f1;font-family:Arial,Helvetica,sans-serif;color:#1f1d1a">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <tr><td>
      <h1 style="margin:0 0 12px;font-size:20px">${heading}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${body}</p>
      <p style="margin:0 0 20px"><a href="${href}" style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${button}</a></p>
      <p style="margin:0;font-size:12px;color:#6b665f;line-height:1.5">Kalau tombol tidak bisa dibuka, salin tautan ini ke browser:<br>${href}</p>
    </td></tr>
  </table></body></html>`;
}

/**
 * Pengirim email production lewat API Resend (https://resend.com, gratis 3.000 email/bulan).
 * Butuh RESEND_API_KEY dan EMAIL_FROM dari domain yang sudah diverifikasi di Resend.
 */
export class ResendEmailSender implements EmailSender {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async sendVerification(to: string, displayName: string, link: string) {
    await this.send(
      to,
      "Verifikasi email akun Nihongo kamu",
      layout(
        `Halo, ${escapeHtml(displayName)}`,
        "Tinggal satu langkah lagi. Tekan tombol di bawah untuk memverifikasi email kamu. Tautan berlaku 24 jam.",
        link,
        "Verifikasi email",
      ),
      `Halo ${displayName},\n\nVerifikasi email kamu lewat tautan ini (berlaku 24 jam):\n${link}\n`,
    );
  }

  async sendPasswordReset(to: string, link: string) {
    await this.send(
      to,
      "Atur ulang kata sandi Nihongo",
      layout(
        "Atur ulang kata sandi",
        "Ada permintaan untuk mengatur ulang kata sandi akunmu. Tautan berlaku 60 menit. Kalau kamu tidak memintanya, abaikan email ini.",
        link,
        "Buat kata sandi baru",
      ),
      `Atur ulang kata sandi lewat tautan ini (berlaku 60 menit):\n${link}\n\nKalau kamu tidak memintanya, abaikan email ini.\n`,
    );
  }

  private async send(to: string, subject: string, html: string, text: string) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend menolak email (${res.status}): ${detail.slice(0, 200)}`);
    }
  }
}
