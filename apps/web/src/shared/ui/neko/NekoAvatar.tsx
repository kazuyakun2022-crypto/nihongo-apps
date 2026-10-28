"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { NekoEngine, type LevelSource } from "./NekoEngine";
import { ASSET_BASE, FX_SPOTS, POSES, rigToPercent, type NekoEmotion, type NekoMode } from "./nekoRig";
import styles from "./nekoAvatar.module.css";

export type { NekoEmotion, NekoMode } from "./nekoRig";
export type { LevelSource } from "./NekoEngine";

export interface NekoAvatarProps {
  /** Status percakapan: idle, listening (mendengar), processing (berpikir), speaking (menjawab). */
  mode?: NekoMode;
  /** Emosi saat menjawab. Tetap terlihat sebentar setelah selesai bicara, lalu kembali biasa. */
  emotion?: NekoEmotion;
  /** Volume mikrofon 0..1, dibaca setiap frame saat mendengar. */
  micLevel?: LevelSource;
  /** Volume suara 0..1, dibaca setiap frame untuk gerak bibir. */
  voiceLevel?: LevelSource;
  /** Lebar avatar (angka = piksel). Default 100% dari wadah. */
  size?: number | string;
  className?: string;
  label?: string;
  onTap?: () => void;
  /** Ubah nama file aset menjadi URL. Default: /neko/<file>. */
  resolveAsset?: (file: string) => string;
}

/** Gambar statis untuk tiap emosi (dipakai saat WebGL tidak tersedia). */
export function stillFor(emotion: NekoEmotion): string {
  return POSES[emotion === "biasa" ? "idle" : emotion].still;
}

function box(x: number, y: number, w: number, h: number): CSSProperties {
  const left = rigToPercent(x);
  const top = rigToPercent(y);
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${rigToPercent(x + w) - left}%`,
    height: `${rigToPercent(y + h) - top}%`,
  };
}

const bubble = (k: "pikirTanya" | "pikirLampu" | "pikirSeru" | "pikirTitik") =>
  box(FX_SPOTS[k].x, FX_SPOTS[k].y, FX_SPOTS[k].w, FX_SPOTS[k].h);

const POS = {
  titik: bubble("pikirTitik"),
  tanya: bubble("pikirTanya"),
  seru: bubble("pikirSeru"),
  lampu: bubble("pikirLampu"),
  wavesL: box(FX_SPOTS.wavesL.x, FX_SPOTS.wavesL.y, FX_SPOTS.wavesL.w, FX_SPOTS.wavesL.h),
  wavesR: box(FX_SPOTS.wavesR.x, FX_SPOTS.wavesR.y, FX_SPOTS.wavesR.w, FX_SPOTS.wavesR.h),
};

/**
 * Maskot Miu-chan animasi penuh: bernapas, berkedip, mengikuti kursor,
 * mendengar, berpikir, berbicara dengan gerak bibir, dan berganti ekspresi
 * sesuai emosi jawaban. Efek seperti air mata, uap, dan tanda marah sudah
 * ada di gambar tiap ekspresi. Tanpa WebGL tampil gambar statis.
 */
export function NekoAvatar({
  mode = "idle",
  emotion = "biasa",
  micLevel,
  voiceLevel,
  size,
  className,
  label = "Miu-chan",
  onTap,
  resolveAsset,
}: NekoAvatarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<NekoEngine | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const engine = new NekoEngine(canvas, root, fxRef.current, {
      reducedMotion: reduced,
      resolveAsset,
      onError: (err) => {
        console.warn("NekoAvatar: memakai gambar statis.", err);
        setFailed(true);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Engine dibuat sekali; resolveAsset hanya dibaca saat mulai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    engineRef.current?.setEmotion(emotion);
  }, [emotion]);

  useEffect(() => {
    engineRef.current?.setLevelSources(micLevel ?? null, voiceLevel ?? null);
  }, [micLevel, voiceLevel]);

  const asset = (file: string) => (resolveAsset ? resolveAsset(file) : ASSET_BASE + file);
  const style: CSSProperties | undefined =
    size === undefined ? undefined : { width: typeof size === "number" ? `${size}px` : size };

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={style}
      role="img"
      aria-label={label}
      data-mode={mode}
      data-expr="biasa"
      data-phase="main"
    >
      {failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.fallback} src={asset(stillFor(emotion))} alt="" draggable={false} />
      ) : (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={(e) => {
            // Ditekan = dielus; tahan untuk terus mengelus
            e.currentTarget.setPointerCapture?.(e.pointerId);
            engineRef.current?.petStart();
            onTap?.();
          }}
          onPointerUp={() => engineRef.current?.petEnd()}
          onPointerCancel={() => engineRef.current?.petEnd()}
          onLostPointerCapture={() => engineRef.current?.petEnd()}
        />
      )}

      <div ref={fxRef} className={styles.fx} aria-hidden="true">
        {/* Gelembung pikiran muncul bergantian saat berpikir */}
        {/* eslint-disable @next/next/no-img-element */}
        <img className={`${styles.pikir} ${styles.pikir1}`} style={POS.titik} src={asset("fx-pikir-titik.webp")} alt="" />
        <img className={`${styles.pikir} ${styles.pikir2}`} style={POS.tanya} src={asset("fx-pikir-tanya.webp")} alt="" />
        <img className={`${styles.pikir} ${styles.pikir3}`} style={POS.seru} src={asset("fx-pikir-seru.webp")} alt="" />
        <img className={`${styles.pikir} ${styles.pikir4}`} style={POS.lampu} src={asset("fx-pikir-lampu.webp")} alt="" />
        {/* eslint-enable @next/next/no-img-element */}
        <span className={`${styles.waves} ${styles.wavesL}`} style={POS.wavesL}>
          <i />
          <i />
          <i />
        </span>
        <span className={`${styles.waves} ${styles.wavesR}`} style={POS.wavesR}>
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
