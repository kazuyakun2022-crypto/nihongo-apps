"use client";

import { OnboardingForm } from "@/features/learning/ui/OnboardingForm";
import { RequireAuth } from "@/shared/ui/RequireAuth";

export default function Page() {
  return (
    <RequireAuth allowIncompleteProfile>
      <OnboardingForm />
    </RequireAuth>
  );
}
