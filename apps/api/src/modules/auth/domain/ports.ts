import type { AuthUser, Role } from "../../../shared/domain/types";
import type { Gender, User } from "./User";

/**
 * Port (interface) yang dibutuhkan use case autentikasi.
 * Implementasinya ada di folder infrastructure, dan bisa diganti tanpa mengubah use case.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: {
    email: string | null;
    passwordHash: string | null;
    displayName: string;
    isGuest: boolean;
    role: Role;
    gender?: Gender | null;
    emailVerifiedAt?: Date | null;
  }): Promise<User>;
  update(id: string, data: Partial<Omit<User, "id">>): Promise<User>;
  updateProfile(id: string, data: OnboardingProfile): Promise<User>;
}

export interface OnboardingProfile {
  currentLevelId: number;
  /** Kunci tujuan belajar dari pengaturan pendaftaran. */
  learningGoal: string;
  dailyTargetMin: number;
  gender?: Gender;
}

/** Memastikan pilihan pendaftaran sesuai pengaturan admin (titik mulai aktif, tes penempatan sudah lulus). */
export interface OnboardingGuard {
  assertAllowed(userId: string, profile: OnboardingProfile): Promise<void>;
}

export interface OAuthAccountRepository {
  findUserId(provider: OAuthProviderName, providerUserId: string): Promise<string | null>;
  link(userId: string, provider: OAuthProviderName, providerUserId: string, email: string | null): Promise<void>;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface SessionRepository {
  create(data: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    deviceName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<SessionRecord>;
  findByTokenHash(hash: string): Promise<SessionRecord | null>;
  rotate(id: string, newHash: string, expiresAt: Date, now: Date): Promise<void>;
  revoke(id: string, now: Date): Promise<void>;
  revokeAllForUser(userId: string, now: Date, exceptSessionId?: string): Promise<void>;
}

export interface OneTimeTokenRecord {
  id: string;
  userId: string;
  email?: string;
  expiresAt: Date;
  usedAt: Date | null;
}

/** Token sekali pakai untuk verifikasi email dan reset password. */
export interface OneTimeTokenRepository {
  createEmailVerification(userId: string, email: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findEmailVerification(tokenHash: string): Promise<OneTimeTokenRecord | null>;
  markEmailVerificationUsed(id: string, now: Date): Promise<void>;
  countRecentEmailVerifications(userId: string, since: Date): Promise<number>;
  createPasswordReset(userId: string, tokenHash: string, expiresAt: Date, ip: string | null): Promise<void>;
  findPasswordReset(tokenHash: string): Promise<OneTimeTokenRecord | null>;
  markPasswordResetUsed(id: string, now: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface AccessTokenService {
  issue(user: AuthUser): string;
  verify(token: string): AuthUser;
}

/** Membuat token acak (dikirim ke klien) dan hash-nya (disimpan di database). */
export interface TokenGenerator {
  generate(): { token: string; hash: string };
  hash(token: string): string;
}

export interface EmailSender {
  sendVerification(to: string, displayName: string, link: string): Promise<void>;
  sendPasswordReset(to: string, link: string): Promise<void>;
}

export type OAuthProviderName = "google" | "apple";

export interface OAuthIdentity {
  provider: OAuthProviderName;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

/** Memverifikasi ID token dari Google/Apple. Implementasi asli ditambahkan saat kredensial siap. */
export interface OAuthVerifier {
  verify(provider: OAuthProviderName, idToken: string): Promise<OAuthIdentity>;
}

export interface DeviceInfo {
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}
