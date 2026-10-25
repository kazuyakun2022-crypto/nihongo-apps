/** Tipe bersama yang dipakai lintas modul. Sengaja tidak bergantung pada Prisma. */
export type Role = "guest" | "student" | "premium" | "teacher" | "admin";
export type UserStatus = "active" | "suspended" | "pending_deletion";

/** Data pengguna yang sudah terautentikasi, diisi oleh middleware auth. */
export interface AuthUser {
  id: string;
  role: Role;
}

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
