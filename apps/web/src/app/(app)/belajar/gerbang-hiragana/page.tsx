"use client";

import { useAuth } from "@/features/auth/application/AuthProvider";
import { MasteryGate } from "@/features/exam/ui/MasteryGate";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function GerbangHiraganaPage() {
  const { user } = useAuth();
  if (user?.role === "admin" || user?.role === "super_admin") return <AdminLearnerNotice featureName="Mastery Gate Hiragana Siswa" />;
  return <MasteryGate />;
}
