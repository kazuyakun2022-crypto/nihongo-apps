"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CHIBI_ASPECT, ChibiMeshEngine } from "./ChibiMeshEngine";
import styles from "./chibiMascot.module.css";

const SRC = "/neko/chibi/neko-chibi.webp";
// Posisi gambar di dalam canvas (canvas punya ruang kosong di sekelilingnya untuk telinga & ekor)
const INSET = { left: "6.43%", top: "3.82%", width: "87.14%" };

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface ChibiMascotProps {
  /** Naikkan nilainya untuk memicu reaksi disentuh (lompat, mata ^^, ekor dikibas). */
  pokeSignal?: number;
  /** Naikkan nilainya untuk membuat mulut bergerak seperti bicara. */
  talkSignal?: number;
  /** Mata terpejam selama bernilai true. */
  eyesClosed?: boolean;
  alt?: string;
  className?: string;
  priority?: boolean;
}

/** Maskot chibi beranimasi (WebGL); tanpa WebGL atau dengan reduced-motion tampil sebagai gambar diam. */
export function ChibiMascot({ pokeSignal = 0, talkSignal = 0, eyesClosed = false, alt = "Miu-chan", className, priority }: ChibiMascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const engineRef = useRef<ChibiMeshEngine | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");
  const [posterLoaded, setPosterLoaded] = useState(false);

  // Gambar dari cache bisa selesai sebelum hidrasi (onLoad terlewat); cek sebelum paint pertama
  useIsomorphicLayoutEffect(() => {
    if (posterRef.current?.complete) setPosterLoaded(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ukuran bisa 0 saat pertama dipasang (halaman masih disembunyikan splash); engine digambar ulang begitu terlihat
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      engineRef.current?.refresh();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const engine = new ChibiMeshEngine(canvas, {
      src: SRC,
      reducedMotion,
      onReady: () => setState("ready"),
      onError: (err) => {
        console.warn("[ChibiMascot] animasi tidak tersedia, pakai gambar diam:", err);
        setState("fallback");
      },
    });
    engineRef.current = engine;
    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (pokeSignal) engineRef.current?.poke();
  }, [pokeSignal]);

  useEffect(() => {
    engineRef.current?.holdEyes(eyesClosed);
  }, [eyesClosed, state]);

  useEffect(() => {
    if (talkSignal) engineRef.current?.say(1100);
  }, [talkSignal]);

  return (
    <div className={`${styles.root} ${state === "fallback" ? styles.floating : ""} ${className ?? ""}`} style={{ aspectRatio: CHIBI_ASPECT }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={posterRef}
        src={SRC}
        alt={alt}
        className={styles.poster}
        style={{ ...INSET, opacity: state === "ready" || !posterLoaded ? 0 : 1 }}
        onLoad={() => setPosterLoaded(true)}
        fetchPriority={priority ? "high" : undefined}
        draggable={false}
      />
      <canvas ref={canvasRef} className={styles.canvas} style={{ opacity: state === "ready" ? 1 : 0 }} aria-hidden="true" />
    </div>
  );
}
