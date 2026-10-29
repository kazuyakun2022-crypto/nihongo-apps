import { Suspense } from "react";
import { LoginForm } from "@/features/auth/ui/LoginForm";

export const metadata = { title: "Masuk" };

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
