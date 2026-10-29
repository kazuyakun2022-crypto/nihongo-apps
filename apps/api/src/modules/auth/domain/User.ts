import type { Role, UserStatus } from "../../../shared/domain/types";

export type Gender = "male" | "female" | "other";

/** Entitas pengguna untuk keperluan autentikasi. Murni TypeScript, tanpa framework. */
export interface User {
  id: string;
  email: string | null;
  passwordHash: string | null;
  isGuest: boolean;
  displayName: string;
  role: Role;
  status: UserStatus;
  currentLevelId: number | null;
  gender?: Gender | null;
  genderUpdatedAt?: Date | null;
  avatarUrl?: string | null;
  dailyTargetMin: number | null;
  streakCount: number;
  xpTotal: number;
  emailVerifiedAt: Date | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
}

/** Aturan bisnis autentikasi (dokumen bagian 10). Ubah angka di sini, bukan di use case. */
export const AuthPolicy = {
  maxFailedLogins: 5,
  lockMinutes: 15,
  emailVerificationHours: 24,
  passwordResetMinutes: 60,
  minPasswordLength: 8,
  guestRetentionDays: 30,
} as const;

export function isLocked(user: User, now: Date): boolean {
  return user.lockedUntil !== null && user.lockedUntil > now;
}

export function needsOnboarding(user: User): boolean {
  return user.currentLevelId === null;
}

/** Bentuk data pengguna yang aman dikirim ke klien (tanpa hash dan data sensitif). */
export interface PublicUser {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  isGuest: boolean;
  emailVerified: boolean;
  needsOnboarding: boolean;
  currentLevelId: number | null;
  gender?: Gender | null;
  genderUpdatedAt?: Date | null;
  avatarUrl?: string | null;
  dailyTargetMin: number | null;
  streakCount: number;
  xpTotal: number;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isGuest: user.isGuest,
    emailVerified: user.emailVerifiedAt !== null,
    needsOnboarding: needsOnboarding(user),
    currentLevelId: user.currentLevelId,
    gender: user.gender ?? null,
    genderUpdatedAt: user.genderUpdatedAt ?? null,
    avatarUrl: user.avatarUrl ?? null,
    dailyTargetMin: user.dailyTargetMin,
    streakCount: user.streakCount,
    xpTotal: user.xpTotal,
  };
}
