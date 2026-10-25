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
 * Placeholder sampai kredensial Google/Apple tersedia.
 * Implementasi asli: verifikasi ID token dengan library google-auth-library / apple-signin-auth.
 */
export class NotConfiguredOAuthVerifier implements OAuthVerifier {
  async verify(provider: OAuthProviderName, _idToken: string): Promise<OAuthIdentity> {
    throw Errors.validation(`Masuk dengan ${provider === "google" ? "Google" : "Apple"} belum dikonfigurasi di server.`);
  }
}
