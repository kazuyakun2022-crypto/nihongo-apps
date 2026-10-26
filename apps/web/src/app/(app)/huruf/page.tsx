"use client";

import { useAuth } from "@/features/auth/application/AuthProvider";
import { kanjiLevelFor } from "@/features/huruf/data/kanjiByLevel";
import { HurufBrowser } from "@/features/huruf/ui/HurufBrowser";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function HurufPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isAdmin) {
    return <AdminLearnerNotice featureName="Materi Karakter & Huruf Siswa" />;
  }

  return <HurufBrowser kanjiLevel={kanjiLevelFor(user?.currentLevelId)} />;
}
