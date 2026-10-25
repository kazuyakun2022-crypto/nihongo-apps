"use client";

import { AppShell } from "@/shared/ui/AppShell";
import { RequireAuth } from "@/shared/ui/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
