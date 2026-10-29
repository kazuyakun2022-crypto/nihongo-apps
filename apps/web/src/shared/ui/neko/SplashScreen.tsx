"use client";

import { useEffect, useRef, useState } from "react";
import { MiuMeshEngine } from "./MiuMeshEngine";
import { createSplashScript, SPLASH_DURATION, WINK_AT } from "./splashScript";
import styles from "./splashScreen.module.css";

export interface SplashScreenProps {
  /** Durasi tampil (ms) sebelum fade-out. Default 1250 (≈1,6 detik termasuk fade). */
  minDuration?: number;
  /** Callback saat splash selesai dan siap hilang. */
  onFinish?: () => void;
  /** Ubah nama file aset → URL. Default: /neko/<file>. */
  resolveAsset?: (file: string) => string;
  /** Kepala mengikuti pointer. Default true. */
  followPointer?: boolean;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  dx: number;
  dy: number;
}
interface Heart {
  id: number;
  x: number;
  size: number;
  delay: number;
  hx: number;
  hr: number;
}

/** Posisi mata yang wink (persen dari avatar). */
const WINK_EYE = { x: 66.6, y: 65 };
const FADE_MS = 350;
/** Wink harus terlihat minimal selama ini sebelum fade-out (ms). */
const WINK_HOLD_MS = 700;
/** Batas aman jika karakter tak kunjung siap (ms). */
const READY_TIMEOUT_MS = 4000;
const defaultResolve = (file: string) => `/neko/${file}`;

let uid = 0;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Splash screen Miu-chan (mesh-warp ala Live2D):
 * muncul → wink + bintang + hati → fade-out (≈1,6 detik).
 * Timeline ekspresi ada di splashScript.ts.
 */
export function SplashScreen({
  minDuration = SPLASH_DURATION,
  onFinish,
  resolveAsset = defaultResolve,
  followPointer = true,
}: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const [isReady, setIsReady] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const finish = () => {
      setFadeOut(true);
      timers.push(
        setTimeout(() => {
          setDone(true);
          finishRef.current?.();
        }, FADE_MS),
      );
    };

    const spawnSparks = () => {
      const n = 8;
      const batch: Spark[] = Array.from({ length: n }, (_, i) => {
        const rad = (((360 / n) * i + rnd(-15, 15)) * Math.PI) / 180;
        const dist = rnd(30, 90);
        return {
          id: ++uid,
          x: WINK_EYE.x + rnd(-2, 2),
          y: WINK_EYE.y + rnd(-1.5, 1.5),
          size: rnd(8, 22),
          delay: i * 0.04,
          dx: Math.cos(rad) * dist,
          dy: Math.sin(rad) * dist,
        };
      });
      setSparks((prev) => [...prev.slice(-24), ...batch]);
    };
    const spawnHearts = () => {
      const batch: Heart[] = Array.from({ length: 5 }, (_, i) => ({
        id: ++uid,
        x: 40 + i * 6 + rnd(0, 4),
        size: rnd(16, 28),
        delay: i * 0.1,
        hx: rnd(-30, 30),
        hr: rnd(-25, 25),
      }));
      setHearts((prev) => [...prev.slice(-10), ...batch]);
    };

    // Waktu sejak HTML pertama kali tampil di layar
    const t0 = (window as unknown as { __splashT0?: number }).__splashT0 || Date.now();
    const readyTimeout = setTimeout(finish, READY_TIMEOUT_MS);
    timers.push(readyTimeout);

    const engine = new MiuMeshEngine(canvas, {
      assets: {
        open: resolveAsset("splash/miu-open.webp"),
        wink: resolveAsset("splash/miu-wink.webp"),
        closed: resolveAsset("splash/miu-closed.webp"),
      },
      followPointer,
      reducedMotion: reduced,
      onReady: () => {
        setIsReady(true);
        clearTimeout(readyTimeout);
        // Total ≈1,6 detik sejak halaman tampil, tapi wink selalu sempat terlihat
        const elapsed = Date.now() - t0;
        const finishAt = Math.max(WINK_AT + WINK_HOLD_MS, minDuration - elapsed);
        for (const [at, run] of createSplashScript(engine, { stars: spawnSparks, hearts: spawnHearts })) {
          timers.push(setTimeout(run, at));
        }
        timers.push(setTimeout(finish, finishAt));
      },

      onError: (err: unknown) => {
        console.error("MiuMeshEngine onError caught:", err);
        timers.push(setTimeout(finish, 300));
      },
    });

    return () => {
      timers.forEach(clearTimeout);
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = () => {
    if (fadeOut || done) return;
    setFadeOut(true);
    setTimeout(() => {
      setDone(true);
      finishRef.current?.();
    }, FADE_MS);
  };

  if (done) return null;

  return (
    <div
      className={`${styles.overlay} ${fadeOut ? styles.fadeOut : ""}`}
      role="status"
      aria-label="Memuat aplikasi Nihongo"
      onClick={handleSkip}
      title="Ketuk untuk lewati"
    >
      <div className={styles.bg} />
      <div className={styles.center}>
        <div className={styles.avatar}>
          {/* Poster awal agar karakter langsung tampak tanpa jeda muat tekstur */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveAsset("splash/miu-open.webp")}
            alt="Miu-chan"
            className={styles.poster}
            style={{ opacity: isReady ? 0 : 1 }}
          />
          <canvas ref={canvasRef} className={styles.canvas} style={{ opacity: isReady ? 1 : 0 }} />

          <div className={styles.starsLayer} aria-hidden="true">
            {sparks.map((s) => (
              <span
                key={s.id}
                className={styles.star}
                style={
                  {
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    width: s.size,
                    height: s.size,
                    animationDelay: `${s.delay}s`,
                    "--dx": `${s.dx}px`,
                    "--dy": `${s.dy}px`,
                  } as React.CSSProperties
                }
              />
            ))}
            {hearts.map((h) => (
              <span
                key={h.id}
                className={styles.heart}
                style={
                  {
                    left: `${h.x}%`,
                    fontSize: h.size,
                    animationDelay: `${h.delay}s`,
                    "--hx": `${h.hx}px`,
                    "--hr": `${h.hr}deg`,
                  } as React.CSSProperties
                }
              >
                ♥
              </span>
            ))}
          </div>
        </div>

        <h1 className={styles.title}>
          <span className={styles.titleJp}>にほんご</span>
          <span className={styles.titleSub}>bersama Miu-chan</span>
        </h1>

        <p className={styles.skipHint} aria-hidden="true">
          Ketuk untuk lewati
        </p>
      </div>
    </div>
  );
}

