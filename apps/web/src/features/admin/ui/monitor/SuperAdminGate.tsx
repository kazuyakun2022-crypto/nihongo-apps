"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { PageSkeleton } from "@/shared/ui/Skeleton";

/** Halaman khusus super admin; server juga menolak role lain (requireRole("super_admin")). */
export function SuperAdminGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user?.role === "super_admin";

  useEffect(() => {
    if (user && !allowed) router.replace("/admin");
  }, [user, allowed, router]);

  if (!allowed) return <PageSkeleton label="Memeriksa hak akses super admin…" />;
  return <>{children}</>;
}
