export type Role = "guest" | "student" | "premium" | "teacher" | "admin" | "super_admin";
export type Gender = "male" | "female" | "other";

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  isGuest: boolean;
  emailVerified: boolean;
  needsOnboarding: boolean;
  currentLevelId: number | null;
  gender?: Gender | null;
  genderUpdatedAt?: string | null;
  avatarUrl?: string | null;
  dailyTargetMin: number;
  streakCount: number;
  xpTotal: number;
  learningGoal?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** Kontrak repository auth. Komponen tidak tahu apakah datanya dari API asli atau tiruan. */
export interface AuthRepository {
  register(input: { email: string; password: string; displayName?: string; gender?: Gender }): Promise<AuthResponse>;
  login(input: { email: string; password: string }): Promise<AuthResponse>;
  loginWithOAuth?(input: { provider: "google" | "apple"; idToken: string }): Promise<AuthResponse>;
  startGuest(): Promise<AuthResponse>;
  restore(): Promise<AuthResponse | null>;
  logout(allDevices?: boolean): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  updateAvatar?(avatarUrl: string | null): Promise<{ user: User }>;
  deleteAvatar?(): Promise<{ user: User }>;
  updateProfile?(input: { displayName: string; gender?: Gender | null }): Promise<{ user: User }>;
}
