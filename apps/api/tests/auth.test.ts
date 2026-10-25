import { beforeEach, describe, expect, it } from "vitest";
import { SessionIssuer } from "../src/modules/auth/application/SessionIssuer";
import { SendEmailVerification } from "../src/modules/auth/application/SendEmailVerification";
import { RegisterWithEmail } from "../src/modules/auth/application/RegisterWithEmail";
import { LoginWithEmail } from "../src/modules/auth/application/LoginWithEmail";
import { StartGuestSession } from "../src/modules/auth/application/StartGuestSession";
import { RequestPasswordReset, ResetPassword } from "../src/modules/auth/application/PasswordReset";
import { AppError } from "../src/shared/domain/errors";
import { FakeEmail, FakeOneTimeTokens, FakeSessions, FakeUsers, fakeAccessTokens, fakeHasher, fakeTokens, fixedClock } from "./fakes";

const device = { deviceName: "test", ipAddress: null, userAgent: null };

function setup() {
  const users = new FakeUsers();
  const sessions = new FakeSessions();
  const oneTimeTokens = new FakeOneTimeTokens();
  const email = new FakeEmail();
  const clock = fixedClock("2026-10-22T08:00:00Z");
  const issuer = new SessionIssuer({ sessions, tokens: fakeTokens, accessTokens: fakeAccessTokens, clock, refreshTtlDays: 30 });
  const sendVerification = new SendEmailVerification({ users, oneTimeTokens, tokens: fakeTokens, email, clock, webOrigin: "http://web" });
  return {
    users,
    sessions,
    oneTimeTokens,
    email,
    clock,
    register: new RegisterWithEmail({ users, hasher: fakeHasher, sessions: issuer, sendVerification, clock }),
    login: new LoginWithEmail({ users, hasher: fakeHasher, sessions: issuer, clock }),
    guest: new StartGuestSession({ users, sessions: issuer }),
    forgot: new RequestPasswordReset({ users, oneTimeTokens, tokens: fakeTokens, email, clock, webOrigin: "http://web" }),
    reset: new ResetPassword({ users, oneTimeTokens, sessions, tokens: fakeTokens, hasher: fakeHasher, clock }),
  };
}

describe("Autentikasi", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => (t = setup()));

  it("mendaftar dengan email, mengirim verifikasi, dan langsung login", async () => {
    const result = await t.register.execute({ displayName: "Andi", email: "Andi@Mail.com", password: "rahasia123", device });
    expect(result.user.email).toBe("andi@mail.com");
    expect(result.user.emailVerified).toBe(false);
    expect(result.user.needsOnboarding).toBe(true);
    expect(t.email.sent[0].link).toContain("/verifikasi-email?token=");
    expect(t.sessions.rows).toHaveLength(1);
  });

  it("menolak email yang sudah terdaftar", async () => {
    await t.register.execute({ displayName: "Andi", email: "a@mail.com", password: "rahasia123", device });
    await expect(t.register.execute({ displayName: "B", email: "a@mail.com", password: "rahasia123", device })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("mengubah akun Tamu menjadi Pelajar tanpa membuat akun baru", async () => {
    const guest = await t.guest.execute(device);
    const result = await t.register.execute({ displayName: "Andi", email: "a@mail.com", password: "rahasia123", guestUserId: guest.user.id, device });
    expect(result.user.id).toBe(guest.user.id);
    expect(result.user.isGuest).toBe(false);
    expect(result.user.role).toBe("student");
  });

  it("mengunci akun 15 menit setelah 5 kali salah password", async () => {
    await t.register.execute({ displayName: "Andi", email: "a@mail.com", password: "rahasia123", device });
    for (let i = 0; i < 5; i++) {
      await expect(t.login.execute({ email: "a@mail.com", password: "salah", device })).rejects.toBeInstanceOf(AppError);
    }
    await expect(t.login.execute({ email: "a@mail.com", password: "rahasia123", device })).rejects.toMatchObject({ code: "LOCKED" });
    t.clock.set("2026-10-22T08:16:00Z");
    await expect(t.login.execute({ email: "a@mail.com", password: "rahasia123", device })).resolves.toBeTruthy();
  });

  it("reset password mengeluarkan semua perangkat", async () => {
    await t.register.execute({ displayName: "Andi", email: "a@mail.com", password: "rahasia123", device });
    await t.forgot.execute("a@mail.com", null);
    const token = t.email.sent.at(-1)!.link.split("token=")[1];
    await t.reset.execute(token, "passwordbaru1");
    expect(t.sessions.rows.every((s) => s.revokedAt)).toBe(true);
    await expect(t.login.execute({ email: "a@mail.com", password: "passwordbaru1", device })).resolves.toBeTruthy();
  });

  it("lupa password untuk email tak terdaftar tidak membocorkan apa pun", async () => {
    await expect(t.forgot.execute("tidakada@mail.com", null)).resolves.toBeUndefined();
    expect(t.email.sent).toHaveLength(0);
  });
});
