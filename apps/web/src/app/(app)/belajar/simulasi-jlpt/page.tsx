"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BelajarSimulasiRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams ? searchParams.toString() : "";
    router.replace(query ? `/simulasi?${query}` : "/simulasi");
  }, [router, searchParams]);

  return null;
}
