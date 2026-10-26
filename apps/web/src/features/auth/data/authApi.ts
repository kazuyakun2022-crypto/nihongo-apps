import { api, apiRequest } from "@/core/http/apiClient";
import type { AuthRepository, AuthResponse } from "../domain/types";

export const authApi: AuthRepository = {
  register: (input) => api.post<AuthResponse>("/auth/register", input),
  login: (input) => api.post<AuthResponse>("/auth/login", input),
  loginWithOAuth: (input) => api.post<AuthResponse>("/auth/oauth", input),
  startGuest: () => api.post<AuthResponse>("/auth/guest"),
  async restore() {
    try {
      return await apiRequest<AuthResponse>("/auth/refresh", { method: "POST", body: {} });
    } catch {
      return null;
    }
  },
  logout: (allDevices = false) => api.post<void>(`/auth/logout${allDevices ? "?all=true" : ""}`),
  forgotPassword: (email) => api.post<void>("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.post<void>("/auth/reset-password", { token, password }),
  verifyEmail: (token) => api.post<void>("/auth/verify-email", { token }),
};
