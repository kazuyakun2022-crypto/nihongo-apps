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
  startGuest: AuthRepository["startGuest"];
  logout: (allDevices?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Menyimpan status login untuk seluruh aplikasi. Repository bisa diganti lewat prop (misalnya untuk test). */
export function AuthProvider({ children, repository = authApi }: { children: React.ReactNode; repository?: AuthRepository }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  const accept = useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken);
    setUser(res.user);
    setStatus("authenticated");
    return res;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: jangan biarkan status gantung di "loading" jika koneksi terputus/diam lama
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setStatus((prev) => (prev === "loading" ? "anonymous" : prev));
      }
    }, 6000);

    repository
      .restore()
      .then((res) => {
        if (mounted) {
          clearTimeout(safetyTimeout);
          res ? accept(res) : setStatus("anonymous");
        }
      })
      .catch(() => {
        if (mounted) {
          clearTimeout(safetyTimeout);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      register: (input) => repository.register(input).then(accept),
      login: (input) => repository.login(input).then(accept),
      startGuest: () => repository.startGuest().then(accept),
      async logout(allDevices) {
        await repository.logout(allDevices).catch(() => undefined);
        tokenStore.set(null);
        // Hapus data pribadi yang di-cache service worker (dokumen 10.6).
        if ("caches" in window) await caches.delete("nihongo-private").catch(() => undefined);
      },
    }),
    [status, user, repository, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}
