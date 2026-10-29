"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/features/auth/data/authApi";
import { AuthCard } from "@/features/auth/ui/AuthCard";
import { Alert } from "@/shared/ui/Alert";
import { SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";

function Verify() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) return setState("error");
    authApi.verifyEmail(token).then(() => setState("ok")).catch(() => setState("error"));
  }, [token]);

  return (
    <AuthCard title="Verifikasi email" mood={state === "ok" ? "semangat" : "berpikir"}>
      {state === "loading" && (
        <SkeletonRegion label="Memeriksa link…">
          <SkeletonText lines={2} />
        </SkeletonRegion>
      )}
      {state === "ok" && <Alert tone="success">Email terverifikasi. Sekarang kamu bisa ngobrol dengan Miu-chan!</Alert>}
      {state === "error" && <Alert>Link tidak valid atau sudah kedaluwarsa. Minta link baru dari halaman Profil.</Alert>}
      <Link href="/beranda">Ke Beranda</Link>
    </AuthCard>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
