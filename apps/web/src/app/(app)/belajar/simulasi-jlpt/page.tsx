"use client";

import { Suspense } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { JlptSimulation } from "@/features/exam/ui/JlptSimulation";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function SimulasiJlptPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isAdmin) {
    return <AdminLearnerNotice featureName="Simulasi JLPT" />;
  }

  return (
    <Suspense>
      <JlptSimulation />
    </Suspense>
  );
}
