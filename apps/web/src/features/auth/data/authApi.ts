import { api, refreshSession } from "@/core/http/apiClient";
import type { AuthRepository, AuthResponse, User } from "../domain/types";

export const authApi: AuthRepository = {
  register: (input) => api.post<AuthResponse>("/auth/register", input),
  login: (input) => api.post<AuthResponse>("/auth/login", input),
  loginWithOAuth: (input) => api.post<AuthResponse>("/auth/oauth", input),
  startGuest: () => api.post<AuthResponse>("/auth/guest"),
  restore: () => refreshSession<AuthResponse>(),
  logout: (allDevices = false) => api.post<void>(`/auth/logout${allDevices ? "?all=true" : ""}`),
  forgotPassword: (email) => api.post<void>("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.post<void>("/auth/reset-password", { token, password }),
  verifyEmail: (token) => api.post<void>("/auth/verify-email", { token }),
  updateAvatar: (avatarUrl: string | null) => api.put<{ user: User }>("/auth/me/avatar", { avatarUrl }),
  deleteAvatar: () => api.delete<{ user: User }>("/auth/me/avatar"),
};
