"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INK_FIT_MIN, inkFit, inkMask, locateGrid } from "../lib/gridLocate";
import { cellQuads, defaultGrid, luminance, snapToGrid, type Img, type Quad } from "../lib/sheetGeometry";
import { loadSheetFont, matchSheet, type SheetLike } from "../lib/sheetIdentify";
import type { CheckedPhoto } from "./TulisHasil";
import styles from "./sheetScanner.module.css";

/**
 * Pemindai lembar latihan yang langsung memeriksa: kamera mencari kisi kotak sendiri, dari 4 penanda hitam (lembar
 * baru) atau dari susunan tulisan (lembar lama / tanpa penanda). Begitu kisi ditemukan dan kamera diam, foto diambil.
 * Sebelum dikirim, huruf contoh di foto dicocokkan dengan lembar yang dipilih: foto lembar lain tidak ikut dinilai.
 * Langkah "cocokkan kotak" manual hanya muncul bila kisi benar-benar tidak ditemukan.
 */

export interface ScanResult {
  photo: CheckedPhoto;
  /** Sudut kisi kotak, skala 0–1 terhadap foto: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
  corners: Quad;
  /** Lembar yang diperiksa (bisa berbeda dari pilihan awal bila pengguna memilih lembar yang terdeteksi). */
  sheetId: string;
}

export interface ScannerSheet extends SheetLike {
  label: string;
}

const SEND_MAX = 1600;
const DETECT_WIDTH = 480;
const ANALYZE_MAX = 900;
/** Berapa kali berturut-turut kisi harus ditemukan di posisi yang sama sebelum foto diambil otomatis. */
const STABLE_HITS = 3;
/** Selisih kecocokan huruf contoh supaya foto dianggap lembar lain (lihat matchSheet). */
const MISMATCH_MARGIN = 0.12;
/** Kecocokan huruf contoh yang sudah pasti lembar yang benar (lembar benar ±0,94; lembar lain < 0,2). */
const SURE_MATCH = 0.7;

type Mode = "idle" | "camera" | "locating" | "adjust" | "mismatch";

function scaleQuad(q: Quad, sx: number, sy = sx): Quad {
  return q.map(([x, y]) => [x * sx, y * sy]) as Quad;
}

function drawGrid(ctx: CanvasRenderingContext2D, charCount: number, quad: Quad, tone: "locked" | "found", lineWidth: number) {
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = tone === "locked" ? "#3fbf5a" : "#f2c037";
  cellQuads(charCount, quad).forEach((q, i) => {
    ctx.beginPath();
    q.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    // Kolom pertama = kotak contoh, tidak dinilai
    if (i % 10 === 0) {
      ctx.fillStyle = "rgba(177,42,58,0.18)";
      ctx.fill();
    }
    ctx.stroke();
  });
  ctx.restore();
}

/** Gambar sumber ke kanvas baru, diperkecil ke sisi terpanjang `max`. */
async function loadCanvas(src: string | CanvasImageSource, width: number, height: number, max: number): Promise<HTMLCanvasElement> {
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  if (typeof src === "string") {
    const img = new Image();
    img.src = src;
    await img.decode();
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function imageOf(canvas: HTMLCanvasElement): Img {
  const d = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
  return { data: d.data, width: d.width, height: d.height, channels: 4 };
}

const nextFrame = () => new Promise((r) => setTimeout(r, 30));

// ───────────────────────── Cadangan: cocokkan kotak manual ─────────────────────────

function GridAdjuster({ photo, charCount, initial, onConfirm, onRetake }: { photo: CheckedPhoto; charCount: number; initial: Quad; onConfirm: (corners: Quad) => void; onRetake: () => void }) {
  const [corners, setCorners] = useState<Quad>(initial);
  const [busy, setBusy] = useState(false);
  const [fit, setFit] = useState<number | null>(null);
  const analysis = useRef<{ lum: Float32Array; ink: Uint8Array; W: number; H: number; s: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const { width: W, height: H } = photo;

  const measure = useCallback(
    (q: Quad) => {
      const a = analysis.current;
      if (a) setFit(inkFit(a.ink, a.W, a.H, charCount, scaleQuad(q, a.s)).fit);
    },
    [charCount],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCanvas(photo.src, W, H, ANALYZE_MAX).then((canvas) => {
      if (cancelled) return;
      const lum = luminance(imageOf(canvas));
      analysis.current = { lum, ink: inkMask(lum, canvas.width, canvas.height), W: canvas.width, H: canvas.height, s: canvas.width / W };
      measure(initial);
    });
    return () => {
      cancelled = true;
    };
    // Hanya saat foto berganti
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.src]);

  async function snap() {
    const a = analysis.current;
    if (!a) return;
    setBusy(true);
    await nextFrame();
    const r = snapToGrid(a.lum, a.W, a.H, charCount, scaleQuad(corners, a.s));
    const q = scaleQuad(r.corners, 1 / a.s);
    setCorners(q);
    measure(q);
    setBusy(false);
  }

  function pointer(e: React.PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H] as [number, number];
  }

  const good = fit !== null && fit >= INK_FIT_MIN;
  const handle = Math.max(W, H) * 0.03;

  return (
    <div className={styles.adjust}>
      <div className={styles.callout} data-tone="warn">
        <b>Kotak-kotaknya belum ditemukan otomatis.</b>
        <span>
          Paling mudah: <b>foto ulang</b> dari atas, lebih dekat, dengan cahaya terang dan seluruh kotak terlihat. Atau geser 4 titik bulat ke sudut
          kotak terluar.
        </span>
      </div>
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt="Foto lembar tulisan" className={styles.stageImg} />
        <svg
          ref={svgRef}
          className={styles.overlay}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onPointerMove={(e) => {
            if (drag.current === null) return;
            const p = pointer(e);
            setCorners((q) => q.map((c, i) => (i === drag.current ? p : c)) as Quad);
          }}
          onPointerUp={() => {
            if (drag.current !== null) measure(corners);
            drag.current = null;
          }}
        >
          {cellQuads(charCount, corners).map((q, i) => (
            <polygon key={i} points={q.map((p) => p.join(",")).join(" ")} className={styles.cell} data-model={i % 10 === 0 || undefined} data-good={good || undefined} />
          ))}
          {corners.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={handle}
              className={styles.handle}
              onPointerDown={(e) => {
                drag.current = i;
                (e.target as Element).setPointerCapture(e.pointerId);
              }}
            />
          ))}
        </svg>
      </div>
      {good && (
        <p className={styles.callout} data-tone="good">
          ✓ Kisi sudah pas dengan tulisanmu.
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} onClick={onRetake}>
          📷 Foto ulang
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => void snap()} disabled={busy}>
          ✨ Rapatkan
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => onConfirm(scaleQuad(corners, 1 / W, 1 / H))} disabled={busy || !good}>
          Periksa tulisan
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Pemindai ─────────────────────────

interface Pending {
  photo: CheckedPhoto;
  /** Foto ukuran analisis (untuk mencari kisi lagi dengan jumlah huruf lain). */
  small: Img;
  detected: ScannerSheet;
}

export function SheetScanner({ charCount, sheetId, sheets, onDone }: { charCount: number; sheetId: string; sheets: ScannerSheet[]; onDone: (scan: ScanResult) => void }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [cameraError, setCameraError] = useState(false);
  const [state, setState] = useState<"search" | "found" | "locked">("search");
  const [shot, setShot] = useState<{ photo: CheckedPhoto; corners: Quad } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [switchFailed, setSwitchFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const quadRef = useRef<Quad | null>(null);
  const selected = sheets.find((s) => s.id === sheetId);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => void loadSheetFont(sheets), [sheets]);

  async function startCamera() {
    setCameraError(false);
    setPending(null);
    setShot(null);
    setMode("camera");
    setState("search");
    quadRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError(true);
      setMode("idle");
    }
  }

  /** Ambil gambar, cari kisi, pastikan lembarnya sesuai, lalu langsung periksa. */
  const takeShot = useCallback(
    async (source: CanvasImageSource | string, width: number, height: number, hint: Quad | null) => {
      // Salin bingkai kamera dulu; setelah kamera dimatikan videonya hitam
      const canvas = await loadCanvas(source, width, height, SEND_MAX);
      stopCamera();
      setMode("locating");
      await nextFrame();
      const photo: CheckedPhoto = { src: canvas.toDataURL("image/jpeg", 0.88), width: canvas.width, height: canvas.height };
      const smallCanvas = await loadCanvas(canvas, canvas.width, canvas.height, ANALYZE_MAX);
      const small = imageOf(smallCanvas);
      // Cari kisi untuk jumlah huruf lembar terpilih, lalu cocokkan huruf contohnya. Bila tidak jelas cocok, coba juga
      // jumlah huruf lain (yang difoto mungkin lembar lain) dan ambil lembar yang paling cocok secara keseluruhan.
      await loadSheetFont(sheets);
      const full = imageOf(canvas);
      const counts = [charCount, ...new Set(sheets.map((s) => s.chars.length).filter((n) => n !== charCount))];
      let selectedHit: { corners: Quad; score: number } | null = null;
      let best: { score: number; id: string } | null = null;
      for (const n of counts) {
        const found = locateGrid(small, n);
        if (!found) continue;
        const candidates = sheets.filter((s) => s.chars.length === n || s.id === sheetId);
        const m = matchSheet(full, scaleQuad(found.corners, canvas.width / small.width, canvas.height / small.height), n, candidates, sheetId);
        if (process.env.NODE_ENV !== "production") console.info("[tulis] cocok lembar", JSON.stringify({ n, ...m }));
        if (n === charCount) selectedHit = { corners: scaleQuad(found.corners, 1 / small.width, 1 / small.height), score: m.selected };
        if (!best || m.best > best.score) best = { score: m.best, id: m.bestId };
        // Huruf contoh jelas cocok dengan lembar terpilih: tidak perlu mencoba yang lain
        if (n === charCount && m.selected >= SURE_MATCH) break;
      }
      if (selectedHit && (!best || best.id === sheetId || best.score - selectedHit.score <= MISMATCH_MARGIN)) {
        onDone({ photo, corners: selectedHit.corners, sheetId });
        return;
      }
      const detected = best ? sheets.find((s) => s.id === best!.id && s.id !== sheetId) : undefined;
      if (detected) {
        setPending({ photo, small, detected });
        setSwitchFailed(false);
        setMode("mismatch");
        return;
      }
      const s = canvas.width / width;
      setShot({ photo, corners: hint ? scaleQuad(hint, s) : defaultGrid(canvas.width, canvas.height, charCount) });
      setMode("adjust");
    },
    [charCount, onDone, sheetId, sheets, stopCamera],
  );

  /** Pengguna memilih memeriksa foto sebagai lembar yang terdeteksi. */
  function checkAsDetected() {
    if (!pending) return;
    const found = locateGrid(pending.small, pending.detected.chars.length);
    if (!found) {
      setSwitchFailed(true);
      return;
    }
    onDone({ photo: pending.photo, corners: scaleQuad(found.corners, 1 / pending.small.width, 1 / pending.small.height), sheetId: pending.detected.id });
  }

  // Gambar kamera + kisi, cari kisi berkala, ambil foto otomatis saat kisi stabil
  useEffect(() => {
    if (mode !== "camera") return;
    let raf = 0;
    let lastDetect = 0;
    let stable = 0;
    let taken = false;
    const small = document.createElement("canvas");
    const draw = (t: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.videoWidth) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (canvas.width !== vw) {
          canvas.width = vw;
          canvas.height = vh;
        }
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, vw, vh);
        if (t - lastDetect > 350 && !taken) {
          lastDetect = t;
          const s = DETECT_WIDTH / vw;
          small.width = DETECT_WIDTH;
          small.height = Math.round(vh * s);
          small.getContext("2d", { willReadFrequently: true })!.drawImage(video, 0, 0, small.width, small.height);
          const found = locateGrid(imageOf(small), charCount, { snap: false });
          const quad = found ? scaleQuad(found.corners, 1 / s) : null;
          const prev = quadRef.current;
          const moved = quad && prev ? Math.max(...quad.map((p, i) => Math.hypot(p[0] - prev[i][0], p[1] - prev[i][1]))) : Infinity;
          stable = quad && moved < vw * 0.015 ? stable + 1 : quad ? 1 : 0;
          quadRef.current = quad;
          setState(!quad ? "search" : stable >= STABLE_HITS ? "locked" : "found");
          if (quad && stable >= STABLE_HITS) {
            taken = true;
            void takeShot(video, vw, vh, quad);
          }
        }
        const quad = quadRef.current;
        if (quad) drawGrid(ctx, charCount, quad, stable >= STABLE_HITS - 1 ? "locked" : "found", Math.max(2, vw / 400));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, charCount, takeShot]);

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const img = new Image();
      img.src = String(reader.result);
      await img.decode();
      await takeShot(img, img.naturalWidth, img.naturalHeight, null);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  const fileInput = <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />;

  if (mode === "adjust" && shot) {
    return (
      <GridAdjuster
        key={shot.photo.src}
        photo={shot.photo}
        charCount={charCount}
        initial={shot.corners}
        onRetake={() => void startCamera()}
        onConfirm={(corners) => onDone({ photo: shot.photo, corners, sheetId })}
      />
    );
  }

  if (mode === "mismatch" && pending) {
    return (
      <div className={styles.mismatch} role="alert">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pending.photo.src} alt="Foto yang diambil" className={styles.mismatchPhoto} />
        <div className={styles.mismatchBody}>
          <p className={styles.mismatchTitle}>Lembarnya berbeda</p>
          <p>
            Yang difoto sepertinya <b>{pending.detected.label}</b> <span lang="ja">({pending.detected.chars.map((c) => c.char).join("")})</span>, sedangkan yang
            kamu pilih <b>{selected?.label}</b> <span lang="ja">({selected?.chars.map((c) => c.char).join("")})</span>.
          </p>
          {switchFailed && <p className={styles.mismatchError}>Kotak lembar itu belum terbaca jelas. Coba foto ulang.</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.btnPrimary} onClick={checkAsDetected}>
              Periksa sebagai {pending.detected.label}
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => void startCamera()}>
              📷 Foto ulang
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scanner}>
      {mode === "camera" ? (
        <div className={styles.live}>
          <video ref={videoRef} className={styles.hiddenVideo} playsInline muted />
          <canvas ref={canvasRef} className={styles.liveCanvas} aria-label="Kamera dengan kisi kotak" />
          <p className={styles.liveStatus} data-state={state} aria-live="polite">
            {state === "locked"
              ? "✓ Kotak ditemukan, memotret…"
              : state === "found"
                ? "Kotak ditemukan, tahan kamera tetap diam…"
                : "Arahkan kamera ke lembar dari atas sampai seluruh kotak masuk layar."}
          </p>
        </div>
      ) : mode === "locating" ? (
        <div className={styles.idle} aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Mencari kotak-kotak tulisanmu…</p>
        </div>
      ) : (
        <div className={styles.idle}>
          <span className={styles.idleIcon} aria-hidden="true">
            📷
          </span>
          <p className={styles.idleTitle}>{cameraError ? "Kamera tidak bisa dibuka" : "Siap memotret lembarmu"}</p>
          <p>
            {cameraError
              ? "Izinkan akses kamera di pengaturan browser, atau unggah foto dari galeri."
              : "Kamera akan mencari kotak huruf, memotret sendiri saat kamera diam, lalu langsung memeriksa."}
          </p>
        </div>
      )}

      {mode !== "locating" && (
        <div className={styles.actions}>
          {mode === "camera" ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                const v = videoRef.current;
                if (v?.videoWidth) void takeShot(v, v.videoWidth, v.videoHeight, quadRef.current);
              }}
            >
              ◉ Ambil foto sekarang
            </button>
          ) : (
            <button type="button" className={styles.btnPrimary} onClick={startCamera}>
              📷 Buka kamera
            </button>
          )}
          <button type="button" className={styles.btnGhost} onClick={() => fileRef.current?.click()}>
            🖼️ Unggah dari galeri
          </button>
        </div>
      )}

      {mode === "idle" && (
        <ul className={styles.tips}>
          <li>
            <span aria-hidden="true">☀️</span> Cahaya terang, tanpa bayangan tangan
          </li>
          <li>
            <span aria-hidden="true">⬇️</span> Kamera tepat di atas lembar
          </li>
          <li>
            <span aria-hidden="true">🔲</span> Semua kotak dan 4 kotak hitam sudut masuk layar
          </li>
        </ul>
      )}
      {fileInput}
    </div>
  );
}
