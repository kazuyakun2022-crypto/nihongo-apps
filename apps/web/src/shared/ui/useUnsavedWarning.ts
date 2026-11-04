"use client";

import { useEffect, useRef } from "react";

/**
 * Peringatan browser saat menutup/memuat ulang tab ketika ada perubahan yang belum disimpan.
 * Panggil di bagian atas komponen, lalu isi `ref.current = dirty` di mana pun `dirty` dihitung
 * (boleh setelah early return, karena itu bukan pemanggilan hook).
 */
export function useUnsavedWarning() {
  const dirtyRef = useRef(false);
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
  return dirtyRef;
}
