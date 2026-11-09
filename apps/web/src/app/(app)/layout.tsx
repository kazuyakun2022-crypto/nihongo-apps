"use client";

import { AppShell } from "@/shared/ui/AppShell";
import { RequireAuth } from "@/shared/ui/RequireAuth";
import { DailyReviewProvider } from "@/features/srs/application/DailyReviewContext";
import { DailyReviewGuard } from "@/features/srs/ui/DailyReviewGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DailyReviewProvider>
        <AppShell>
          <DailyReviewGuard>{children}</DailyReviewGuard>
        </AppShell>
      </DailyReviewProvider>
    </RequireAuth>
  );
}



