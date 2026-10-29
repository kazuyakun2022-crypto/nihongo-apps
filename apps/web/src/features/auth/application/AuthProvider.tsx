"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { tokenStore } from "@/core/http/apiClient";
import { authApi } from "../data/authApi";
import type { AuthRepository, AuthResponse, User } from "../domain/types";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  user: User | null;
  register: AuthRepository["register"];
  login: AuthRepository["login"];
  loginWithOAuth: (input: { provider: "google" | "apple"; idToken: string }) => Promise<AuthResponse>;
  startGuest: AuthRepository["startGuest"];
  logout: (allDevices?: boolean) => Promise<void>;
  updateAvatar: (avatarUrl: string | null) => Promise<User>;
  updateUser: (updatedUser: Partial<User>) => void;
  updateProfile: (input: { displayName: string; gender?: import("../domain/types").Gender | null }) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = "nihongo_cached_user";

/** Menyimpan status login untuk seluruh aplikasi. Repository bisa diganti lewat prop (misalnya untuk test). */
export function AuthProvider({ children, repository = authApi }: { children: React.ReactNode; repository?: AuthRepository }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken);
    setUser(res.user);
    setStatus("authenticated");
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    } catch {}
    return res;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Di client: baca cache agar UI instan tanpa hydration error
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        setUser(JSON.parse(cached) as User);
        setStatus("authenticated");
      }
    } catch {}

    // Safety timeout: jangan biarkan status gantung di "loading" jika koneksi terputus/diam lama
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setStatus((prev) => (prev === "loading" ? "anonymous" : prev));
      }
    }, 3500);

    repository
      .restore()
      .then((res) => {
        if (mounted) {
          clearTimeout(safetyTimeout);
          if (res) {
            accept(res);
          } else {
            try {
              localStorage.removeItem(USER_CACHE_KEY);
            } catch {}
            setUser(null);
            setStatus("anonymous");
          }
        }
      })
      .catch(() => {
        if (mounted) {
          clearTimeout(safetyTimeout);
          try {
            localStorage.removeItem(USER_CACHE_KEY);
          } catch {}
          setUser(null);
          setStatus("anonymous");
        }
      });

    // Auto-refresh token sebelum 15 menit habis (tiap 10 menit jika tab dibiarkan terbuka)
    const refreshInterval = setInterval(() => {
      if (tokenStore.get()) {
        repository.restore().then((res) => {
          if (mounted && res) accept(res);
        }).catch(() => undefined);
      }
    }, 10 * 60 * 1000);

    // Saat tab aktif kembali setelah dibiarkan / layar dinyalakan kembali
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!tokenStore.get()) {
          repository.restore().then((res) => {
            if (mounted && res) accept(res);
          }).catch(() => undefined);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const unsub = tokenStore.subscribe((token) => {
      if (!token && mounted) {
        setUser(null);
        setStatus("anonymous");
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsub();
    };
  }, [repository, accept]);

  const updateAvatar = useCallback(
    async (avatarUrl: string | null) => {
      if (!repository.updateAvatar) throw new Error("Fitur avatar tidak didukung");
      const res = await repository.updateAvatar(avatarUrl);
      setUser(res.user);
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
      } catch {}
      return res.user;
    },
    [repository],
  );

  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const updateProfile = useCallback(
    async (input: { displayName: string; gender?: import("../domain/types").Gender | null }) => {
      if (!repository.updateProfile) throw new Error("Fitur edit profil tidak didukung");
      const res = await repository.updateProfile(input);
      setUser(res.user);
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
      } catch {}
      return res.user;
    },
    [repository],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      register: (input) => repository.register(input).then(accept),
      login: (input) => repository.login(input).then(accept),
      loginWithOAuth: (input) => (repository.loginWithOAuth ? repository.loginWithOAuth(input) : Promise.reject(new Error("OAuth tidak tersedia"))).then(accept),
      startGuest: () => repository.startGuest().then(accept),
      updateAvatar,
      updateUser,
      updateProfile,
      async logout(allDevices) {
        try {
          localStorage.removeItem(USER_CACHE_KEY);
        } catch {}
        await repository.logout(allDevices).catch(() => undefined);
        tokenStore.set(null);
        // Hapus data pribadi yang di-cache service worker (dokumen 10.6).
        if ("caches" in window) await caches.delete("nihongo-private").catch(() => undefined);
      },
    }),
    [status, user, repository, accept, updateAvatar, updateUser, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
