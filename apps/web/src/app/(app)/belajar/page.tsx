"use client";

import { useAuth } from "@/features/auth/application/AuthProvider";
import { LearningPath } from "@/features/learning/ui/LearningPath";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function BelajarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isAdmin) {
    return <AdminLearnerNotice featureName="Kurikulum & Bab Belajar Siswa" />;
  }

  return <LearningPath />;
}
