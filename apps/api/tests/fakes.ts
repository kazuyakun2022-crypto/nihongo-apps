/** Implementasi palsu (in-memory) dari port, untuk menguji use case tanpa database. */
import type { User } from "../src/modules/auth/domain/User";
import type {
  AccessTokenService,
  EmailSender,
  OneTimeTokenRecord,
  OneTimeTokenRepository,
  PasswordHasher,
  SessionRecord,
  SessionRepository,
  TokenGenerator,
  UserRepository,
} from "../src/modules/auth/domain/ports";

let seq = 0;
const id = () => `id-${++seq}`;

export class FakeUsers implements UserRepository {
  rows = new Map<string, User>();
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.rows.values()].find((u) => u.email === email) ?? null;
  }
  async create(data: Parameters<UserRepository["create"]>[0]) {
    const user: User = {
      id: id(),
      status: "active",
      currentLevelId: null,
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      emailVerifiedAt: data.emailVerifiedAt ?? null,
      email: data.email,
      passwordHash: data.passwordHash,
      displayName: data.displayName,
      isGuest: data.isGuest,
      role: data.role,
      dailyTargetMin: 10,
      streakCount: 0,
      xpTotal: 0,
    };
    this.rows.set(user.id, user);
    return user;
  }
  async update(id: string, data: Partial<Omit<User, "id">>) {
    const next = { ...this.rows.get(id)!, ...data };
    this.rows.set(id, next);
    return next;
  }
  async updateProfile(id: string, data: { currentLevelId: number }) {
    return this.update(id, { currentLevelId: data.currentLevelId });
  }
}

export class FakeSessions implements SessionRepository {
  rows: SessionRecord[] = [];
  async create(data: Parameters<SessionRepository["create"]>[0]) {
    const s = { id: id(), userId: data.userId, refreshTokenHash: data.refreshTokenHash, expiresAt: data.expiresAt, revokedAt: null };
    this.rows.push(s);
    return s;
  }
  async findByTokenHash(hash: string) {
    return this.rows.find((s) => s.refreshTokenHash === hash) ?? null;
  }
  async rotate(id: string, newHash: string, expiresAt: Date) {
    Object.assign(this.rows.find((s) => s.id === id)!, { refreshTokenHash: newHash, expiresAt });
  }
  async revoke(id: string, now: Date) {
    this.rows.find((s) => s.id === id)!.revokedAt = now;
  }
  async revokeAllForUser(userId: string, now: Date) {
    this.rows.filter((s) => s.userId === userId).forEach((s) => (s.revokedAt = now));
  }
}

export class FakeOneTimeTokens implements OneTimeTokenRepository {
  verifications: (OneTimeTokenRecord & { tokenHash: string; createdAt: Date })[] = [];
  resets: (OneTimeTokenRecord & { tokenHash: string })[] = [];
  async createEmailVerification(userId: string, email: string, tokenHash: string, expiresAt: Date) {
    this.verifications.push({ id: id(), userId, email, tokenHash, expiresAt, usedAt: null, createdAt: new Date() });
  }
  async findEmailVerification(tokenHash: string) {
    return this.verifications.find((v) => v.tokenHash === tokenHash) ?? null;
  }
  async markEmailVerificationUsed(id: string, now: Date) {
    this.verifications.find((v) => v.id === id)!.usedAt = now;
  }
  async countRecentEmailVerifications(userId: string, since: Date) {
    return this.verifications.filter((v) => v.userId === userId && v.createdAt >= since).length;
  }
  async createPasswordReset(userId: string, tokenHash: string, expiresAt: Date) {
    this.resets.push({ id: id(), userId, tokenHash, expiresAt, usedAt: null });
  }
  async findPasswordReset(tokenHash: string) {
    return this.resets.find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async markPasswordResetUsed(id: string, now: Date) {
    this.resets.find((r) => r.id === id)!.usedAt = now;
  }
}

export const fakeHasher: PasswordHasher = {
  hash: async (p) => `hashed:${p}`,
  verify: async (p, h) => h === `hashed:${p}`,
};

export const fakeTokens: TokenGenerator = {
  generate: () => {
    const token = `tok-${++seq}`;
    return { token, hash: `h(${token})` };
  },
  hash: (t) => `h(${t})`,
};

export const fakeAccessTokens: AccessTokenService = {
  issue: (u) => `access:${u.id}:${u.role}`,
  verify: (t) => {
    const [, id, role] = t.split(":");
    return { id, role: role as never };
  },
};

export class FakeEmail implements EmailSender {
  sent: { to: string; link: string }[] = [];
  async sendVerification(to: string, _name: string, link: string) {
    this.sent.push({ to, link });
  }
  async sendPasswordReset(to: string, link: string) {
    this.sent.push({ to, link });
  }
}

export const fixedClock = (iso: string) => {
  let now = new Date(iso);
  return { now: () => now, set: (next: string) => (now = new Date(next)) };
};
