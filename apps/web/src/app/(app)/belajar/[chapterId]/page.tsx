"use client";

import { useAuth } from "@/features/auth/application/AuthProvider";
import { ChapterLesson } from "@/features/learning/ui/ChapterLesson";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function Page({ params }: { params: { chapterId: string } }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isAdmin) {
    return <AdminLearnerNotice featureName="Materi & Kuis Bab Siswa" />;
  }

  return <ChapterLesson chapterId={params.chapterId} />;
}
