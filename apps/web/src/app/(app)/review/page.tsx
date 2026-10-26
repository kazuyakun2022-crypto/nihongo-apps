"use client";

import { useAuth } from "@/features/auth/application/AuthProvider";
import { ReviewDeck } from "@/features/srs/ui/ReviewDeck";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function ReviewPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isAdmin) {
    return <AdminLearnerNotice featureName="Review Kartu SRS Siswa" />;
  }

  return <ReviewDeck />;
}
