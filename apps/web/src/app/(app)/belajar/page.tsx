"use client";

import { useAuth } from "@/features/auth/application/AuthProvider";
import { StructuredLearningRoadmap } from "@/features/learning/ui/StructuredLearningRoadmap";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function BelajarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isAdmin) {
    return <AdminLearnerNotice featureName="Kurikulum & Bab Belajar Siswa" />;
  }

  return <StructuredLearningRoadmap />;
}
