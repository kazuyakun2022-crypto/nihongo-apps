import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser, requireAuth, type AccessTokenVerifier } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { DeviceInfo } from "../domain/ports";
import type { AuthResult } from "../application/SessionIssuer";
import type { RegisterWithEmail } from "../application/RegisterWithEmail";
import type { LoginWithEmail } from "../application/LoginWithEmail";
import type { LoginWithOAuth } from "../application/LoginWithOAuth";
import type { StartGuestSession } from "../application/StartGuestSession";
import type { RefreshSession } from "../application/RefreshSession";
import type { Logout } from "../application/Logout";
import type { VerifyEmail } from "../application/VerifyEmail";
import type { SendEmailVerification } from "../application/SendEmailVerification";
import type { RequestPasswordReset, ResetPassword } from "../application/PasswordReset";
import type { GetCurrentUser } from "../application/GetCurrentUser";
import type { CompleteOnboarding } from "../application/CompleteOnboarding";
import type { UpdateAvatar } from "../application/UpdateAvatar";

export interface AuthUseCases {
  register: RegisterWithEmail;
  login: LoginWithEmail;
  loginWithOAuth: LoginWithOAuth;
  startGuest: StartGuestSession;
  refresh: RefreshSession;
  logout: Logout;
  verifyEmail: VerifyEmail;
  sendVerification: SendEmailVerification;
  requestPasswordReset: RequestPasswordReset;
  resetPassword: ResetPassword;
  getCurrentUser: GetCurrentUser;
  completeOnboarding: CompleteOnboarding;
  updateAvatar: UpdateAvatar;
}

const REFRESH_COOKIE = "nihongo_rt";

const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Nama panggilan wajib diisi").max(50),
  email: z.string().email("Format email belum benar"),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
  gender: z.enum(["male", "female", "other"]).optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const oauthSchema = z.object({ provider: z.enum(["google", "apple"]), idToken: z.string().min(1) });
const tokenSchema = z.object({ token: z.string().min(1) });
const forgotSchema = z.object({ email: z.string().email() });
const onboardingSchema = z.object({
  currentLevelId: z.number().int().min(1).max(6),
  learningGoal: z.enum(["jlpt", "kerja", "hobi", "wisata"]),
  dailyTargetMin: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  gender: z.enum(["male", "female", "other"]).optional(),
});
const resetSchema = z.object({ token: z.string().min(1), password: z.string().min(8).max(128) });
const avatarSchema = z.object({
  avatarUrl: z.string().max(2_500_000).nullable(),
});

export function authRoutes(uc: AuthUseCases, verifier: AccessTokenVerifier, opts: { secureCookies: boolean }): Router {
  const r = Router();
  const auth = requireAuth(verifier);

  const sendAuth = (res: Response, result: AuthResult | Awaited<ReturnType<RefreshSession["execute"]>>, status = 200) => {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: opts.secureCookies,
      sameSite: "lax",
      path: "/api/auth",
      expires: result.refreshExpiresAt,
    });
    res.status(status).json({ accessToken: result.accessToken, user: result.user });
  };

  r.post("/register", asyncHandler(async (req, res) => {
    const body = parseBody(registerSchema, req.body);
    const guestUserId = optionalUserId(req, verifier);
    sendAuth(res, await uc.register.execute({ ...body, guestUserId, device: device(req) }), 201);
  }));

  r.post("/login", asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body);
    sendAuth(res, await uc.login.execute({ ...body, device: device(req) }));
  }));

  r.post("/oauth", asyncHandler(async (req, res) => {
    const body = parseBody(oauthSchema, req.body);
    sendAuth(res, await uc.loginWithOAuth.execute({ ...body, device: device(req) }));
  }));

  r.post("/guest", asyncHandler(async (req, res) => {
    sendAuth(res, await uc.startGuest.execute(device(req)), 201);
  }));

  r.post("/refresh", asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Belum masuk." } });
      return;
    }
    sendAuth(res, await uc.refresh.execute(token));
  }));

  r.post("/logout", asyncHandler(async (req, res) => {
    const allDevices = req.query.all === "true";
    const userId = allDevices ? optionalUserId(req, verifier) : undefined;
    await uc.logout.execute(req.cookies?.[REFRESH_COOKIE], { allDevices, userId });
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.status(204).end();
  }));

  r.post("/verify-email", asyncHandler(async (req, res) => {
    await uc.verifyEmail.execute(parseBody(tokenSchema, req.body).token);
    res.status(204).end();
  }));

  r.post("/verify-email/resend", auth, asyncHandler(async (req, res) => {
    await uc.sendVerification.execute(currentUser(req).id);
    res.status(204).end();
  }));

  r.post("/forgot-password", asyncHandler(async (req, res) => {
    await uc.requestPasswordReset.execute(parseBody(forgotSchema, req.body).email, req.ip ?? null);
    res.json({ message: "Jika email terdaftar, link reset sudah dikirim." });
  }));

  r.post("/reset-password", asyncHandler(async (req, res) => {
    const body = parseBody(resetSchema, req.body);
    await uc.resetPassword.execute(body.token, body.password);
    res.status(204).end();
  }));

  r.get("/me", auth, asyncHandler(async (req, res) => {
    res.json({ user: await uc.getCurrentUser.execute(currentUser(req).id) });
  }));

  r.put("/me/onboarding", auth, asyncHandler(async (req, res) => {
    res.json({ user: await uc.completeOnboarding.execute(currentUser(req).id, parseBody(onboardingSchema, req.body)) });
  }));

  r.put("/me/avatar", auth, asyncHandler(async (req, res) => {
    const body = parseBody(avatarSchema, req.body);
    res.json({ user: await uc.updateAvatar.execute(currentUser(req).id, body.avatarUrl) });
  }));

  r.delete("/me/avatar", auth, asyncHandler(async (req, res) => {
    res.json({ user: await uc.updateAvatar.execute(currentUser(req).id, null) });
  }));

  return r;
}

function device(req: Request): DeviceInfo {
  const userAgent = req.header("user-agent") ?? null;
  return {
    deviceName: req.header("x-device-name") ?? guessDevice(userAgent),
    ipAddress: req.ip ?? null,
    userAgent,
  };
}

function guessDevice(ua: string | null): string | null {
  if (!ua) return null;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : "Perangkat lain";
  return `Browser di ${os}`;
}

function optionalUserId(req: Request, verifier: AccessTokenVerifier): string | undefined {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  try {
    return verifier.verify(header.slice(7)).id;
  } catch {
    return undefined;
  }
}
