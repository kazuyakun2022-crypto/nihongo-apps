"use client";

import { useEffect, useRef } from "react";

/**
 * useLayerBack
 * Mengintegrasikan layer modal / drawer / sub-step di layar dengan browser history
 * (termasuk tombol fisik / gestur back HP Android dan tombol browser).
 *
 * Saat `active` bernilai true:
 * - Menyimpan checkpoint di history stack (`window.history.pushState`).
 * - Saat user menekan Back, event `popstate` dicegat dan `onBack()` dipanggil,
 *   sehingga aplikasi hanya mundur 1 layer per step (bukan mental ke layar utama).
 * - Saat layer ditutup melalui tombol di layar, history dibersihkan secara sinkron.
 */
export function useLayerBack(active: boolean, onBack: () => void, layerName?: string) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return;
    }

    const stateKey = `layer_${layerName || "step"}_${Date.now()}`;
    const currentState = window.history.state || {};

    try {
      window.history.pushState({ ...currentState, __subLayer: stateKey }, "");
      pushedRef.current = true;
    } catch {
      // Fallback jika storage/history dibatasi
      pushedRef.current = false;
    }

    const handlePopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onBackRef.current();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        try {
          if (window.history.state?.__subLayer === stateKey) {
            window.history.back();
          }
        } catch {
          /* noop */
        }
      }
    };
  }, [active, layerName]);
}

