"use client";

import { Suspense } from "react";
import { KamusGambar } from "@/features/kamus/ui/KamusGambar";

export default function KamusPage() {
  return (
    <Suspense>
      <KamusGambar />
    </Suspense>
  );
}
