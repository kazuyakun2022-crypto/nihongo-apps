export type Role = "guest" | "student" | "premium" | "teacher" | "admin";

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  isGuest: boolean;
  emailVerified: boolean;
  needsOnboarding: boolean;
  currentLevelId: number | null;
  dailyTargetMin: number;
  streakCount: number;
  xpTotal: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** Kontrak repository auth. Komponen tidak tahu apakah datanya dari API asli atau tiruan. */
export interface AuthRepository {
  register(input: { displayName: string; email: string; password: string }): Promise<AuthResponse>;
  login(input: { email: string; password: string }): Promise<AuthResponse>;
  startGuest(): Promise<AuthResponse>;
  restore(): Promise<AuthResponse | null>;
  logout(allDevices?: boolean): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}
