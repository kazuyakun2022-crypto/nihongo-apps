"use client";

import { useCallback, useEffect, useState } from "react";

/** HP dianggap sejajar kertas di meja bila kemiringan depan-belakang (beta) dan kiri-kanan (gamma) di bawah ini. */
const LEVEL_DEG = 10;

type PermissionFn = () => Promise<"granted" | "denied">;

/**
 * Kemiringan HP untuk indikator "kamera sejajar kertas". Di iPhone izin sensor harus diminta dari ketukan pengguna
 * (`request` dipanggil saat tombol "Buka kamera" diketuk); bila ditolak atau perangkat tidak punya sensor (laptop),
 * `supported` tetap false dan indikator tidak ditampilkan.
 */
export function useTilt(active: boolean) {
  const [supported, setSupported] = useState(false);
  const [level, setLevel] = useState<boolean | null>(null);

  const request = useCallback(async () => {
    const Orientation = typeof window !== "undefined" ? (window.DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn } | undefined) : undefined;
    if (!Orientation?.requestPermission) return;
    try {
      await Orientation.requestPermission();
    } catch {
      // Ditolak: indikator tidak muncul
    }
  }, []);

  useEffect(() => {
    if (!active || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      setSupported(true);
      setLevel(Math.abs(e.beta) < LEVEL_DEG && Math.abs(e.gamma) < LEVEL_DEG);
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [active]);

  return { supported, level, request };
}
