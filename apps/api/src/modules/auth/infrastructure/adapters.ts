import { OAuth2Client } from "google-auth-library";
import { Errors } from "../../../shared/domain/errors";
import type { EmailSender, OAuthIdentity, OAuthProviderName, OAuthVerifier } from "../domain/ports";

/**
 * Pengirim email untuk development: link dicetak ke terminal.
 * Untuk production, buat kelas baru (misalnya ResendEmailSender) yang mengimplementasikan EmailSender,
 * lalu ganti di src/main/container.ts.
 */
export class ConsoleEmailSender implements EmailSender {
  async sendVerification(to: string, displayName: string, link: string) {
    console.info(`\n[email] Verifikasi untuk ${displayName} <${to}>:\n${link}\n`);
  }
  async sendPasswordReset(to: string, link: string) {
    console.info(`\n[email] Reset password untuk <${to}>:\n${link}\n`);
  }
}

/**
 * Verifikasi ID token Google menggunakan google-auth-library.
 * Hanya aktif jika GOOGLE_CLIENT_ID dikonfigurasi.
 */
export class GoogleOAuthVerifier implements OAuthVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string) {
    this.client = new OAuth2Client(clientId);
  }

  async verify(provider: OAuthProviderName, idToken: string): Promise<OAuthIdentity> {
    if (provider !== "google") {
      throw Errors.validation("Hanya Google yang didukung saat ini.");
    }
    if (!this.clientId) {
      throw Errors.validation("Masuk dengan Google belum dikonfigurasi di server.");
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw Errors.validation("Token Google tidak valid.");
      }
      const emailVerified = Boolean(payload.email_verified);
      return {
        provider: "google",
        providerUserId: payload.sub,
        email: payload.email ?? null,
        emailVerified,
        name: payload.name ?? payload.given_name ?? null,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes("Token used too late")) {
        throw Errors.validation("Token Google kedaluwarsa. Coba masuk lagi.");
      }
      throw Errors.validation("Token Google tidak valid.");
    }
  }
}

export class NotConfiguredOAuthVerifier implements OAuthVerifier {
  async verify(provider: OAuthProviderName, _idToken: string): Promise<OAuthIdentity> {
    throw Errors.validation(`Masuk dengan ${provider === "google" ? "Google" : "Apple"} belum dikonfigurasi di server.`);
  }
}
