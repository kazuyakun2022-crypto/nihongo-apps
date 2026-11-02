"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { canvasAtWidth, imageOf, loadCanvas, nextFrame, quadBounds, scaleQuad } from "../lib/canvasImage";
import { drawnCellQuads, lineMask, locateDrawnGrid, measureDrawnGrid, type DrawnGrid } from "../lib/drawnGrid";
import { ANALYSIS_WIDTH, photoQuality, qualityProblems } from "../lib/photoQuality";
import type { Quad } from "../lib/sheetGeometry";
import { useTilt } from "../lib/useTilt";
import { QualityReview, ScanAids } from "./ScanAids";
import type { CheckedPhoto } from "./TulisHasil";
import styles from "./sheetScanner.module.css";

/**
 * Pemindai kisi yang digambar sendiri (Gerbang Tulis tanpa printer). Kamera mencari bingkai `cols × rows` dari garis
 * yang digambar siswa (lib/drawnGrid.ts), memotret sendiri saat kisi stabil dan foto cukup jelas, lalu mengirim sudut
 * bingkai dan letak setiap sekat. Bila kisi tidak ditemukan, siswa menggeser 4 sudut sendiri.
 */

export interface DrawnScan {
  photo: CheckedPhoto;
  /** Sudut bingkai, skala 0–1 terhadap foto: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
  corners: Quad;
  xs: number[];
  ys: number[];
}

const SEND_MAX = 1600;
/** Garis pena tipis: deteksi butuh resolusi lebih tinggi daripada lembar cetak berpenanda hitam. */
const DETECT_WIDTH = ANALYSIS_WIDTH;
const ANALYZE_WIDTH = 1000;
const STABLE_HITS = 3;

type Mode = "idle" | "camera" | "locating" | "adjust" | "quality";

const even = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

function drawCells(ctx: CanvasRenderingContext2D, grid: Pick<DrawnGrid, "corners" | "xs" | "ys">, tone: "locked" | "found", lineWidth: number) {
  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = tone === "locked" ? "#3fbf5a" : "#f2c037";
  for (const q of drawnCellQuads(grid)) {
    ctx.beginPath();
    q.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

// ───────────────────────── Cadangan: geser sudut manual ─────────────────────────

function CornerAdjuster({
  photo,
  cols,
  rows,
  initial,
  onConfirm,
  onRetake,
}: {
  photo: CheckedPhoto;
  cols: number;
  rows: number;
  initial: Quad;
  onConfirm: (scan: DrawnScan) => void;
  onRetake: () => void;
}) {
  const [corners, setCorners] = useState<Quad>(initial);
  const [measured, setMeasured] = useState<DrawnGrid | null>(null);
  const analysis = useRef<{ mask: (x: number, y: number) => boolean; s: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const { width: W, height: H } = photo;

  const measure = useCallback(
    (q: Quad) => {
      const a = analysis.current;
      if (!a) return;
      const m = measureDrawnGrid(a.mask, scaleQuad(q, a.s), cols, rows);
      setMeasured(m ? { ...m, corners: q } : null);
    },
    [cols, rows],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCanvas(photo.src, W, H, ANALYZE_WIDTH).then((canvas) => {
      if (cancelled) return;
      analysis.current = { mask: lineMask(imageOf(canvas)), s: canvas.width / W };
      measure(initial);
    });
    return () => {
      cancelled = true;
    };
    // Hanya saat foto berganti
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.src]);

  function pointer(e: React.PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H] as [number, number];
  }

  const grid = measured ?? { corners, xs: even(cols), ys: even(rows) };
  const handle = Math.max(W, H) * 0.03;

  return (
    <div className={styles.adjust}>
      <div className={styles.callout} data-tone="warn">
        <b>Kisinya belum ditemukan otomatis.</b>
        <span>
          Paling mudah: <b>foto ulang</b> dari atas dengan seluruh bingkai terlihat dan cahaya terang. Atau geser 4 titik bulat ke sudut luar bingkai
          kisimu.
        </span>
      </div>
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt="Foto kisi tulisan" className={styles.stageImg} />
        <svg
          ref={svgRef}
          className={styles.overlay}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onPointerMove={(e) => {
            if (drag.current === null) return;
            const p = pointer(e);
            setCorners((q) => q.map((c, i) => (i === drag.current ? p : c)) as Quad);
            setMeasured(null);
          }}
          onPointerUp={() => {
            if (drag.current !== null) measure(corners);
            drag.current = null;
          }}
        >
          {drawnCellQuads(measured ? grid : { ...grid, corners }).map((q, i) => (
            <polygon key={i} points={q.map((p) => p.join(",")).join(" ")} className={styles.cell} data-good={measured ? true : undefined} />
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
      <p className={styles.callout} data-tone={measured ? "good" : "warn"}>
        {measured ? "✓ Garis-garis kisimu terbaca." : `Garis sekat belum terbaca; kotak akan dibagi rata ${cols} × ${rows}.`}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} onClick={onRetake}>
          📷 Foto ulang
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => onConfirm({ photo, corners: scaleQuad(corners, 1 / W, 1 / H), xs: grid.xs, ys: grid.ys })}
        >
          Periksa tulisan
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Pemindai ─────────────────────────

export function DrawnGridScanner({ cols, rows, onDone }: { cols: number; rows: number; onDone: (scan: DrawnScan) => void }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [cameraError, setCameraError] = useState(false);
  const [state, setState] = useState<"search" | "found" | "locked">("search");
  const [shot, setShot] = useState<{ photo: CheckedPhoto; corners: Quad } | null>(null);
  const [review, setReview] = useState<{ photo: CheckedPhoto; problems: string[]; hint: Quad | null } | null>(null);
  const [liveProblems, setLiveProblems] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<DrawnGrid | null>(null);
  const tilt = useTilt(mode === "camera");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    // Izin sensor kemiringan (iPhone) harus diminta langsung dari ketukan ini
    void tilt.request();
    setCameraError(false);
    setShot(null);
    setReview(null);
    setLiveProblems([]);
    setMode("camera");
    setState("search");
    gridRef.current = null;
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

  /** Ambil gambar, periksa kualitas, cari kisi di resolusi lebih tinggi, lalu kirim (atau geser sudut manual). */
  const takeShot = useCallback(
    async (source: CanvasImageSource | string, width: number, height: number, hint: Quad | null, force = false) => {
      const canvas = await loadCanvas(source, width, height, SEND_MAX);
      stopCamera();
      setMode("locating");
      await nextFrame();
      const photo: CheckedPhoto = { src: canvas.toDataURL("image/jpeg", 0.88), width: canvas.width, height: canvas.height };
      const photoHint = hint ? scaleQuad(hint, canvas.width / width) : null;
      if (!force) {
        const qc = await canvasAtWidth(canvas, canvas.width, canvas.height, ANALYSIS_WIDTH);
        const problems = qualityProblems(photoQuality(imageOf(qc), photoHint ? quadBounds(scaleQuad(photoHint, qc.width / canvas.width)) : undefined));
        if (problems.length) {
          setReview({ photo, problems, hint: photoHint });
          setMode("quality");
          return;
        }
      }
      const small = await canvasAtWidth(canvas, canvas.width, canvas.height, ANALYZE_WIDTH);
      await nextFrame();
      const found = locateDrawnGrid(imageOf(small), cols, rows);
      if (found) {
        onDone({ photo, corners: scaleQuad(found.corners, 1 / small.width, 1 / small.height), xs: found.xs, ys: found.ys });
        return;
      }
      const inset: Quad = [
        [canvas.width * 0.12, canvas.height * 0.12],
        [canvas.width * 0.88, canvas.height * 0.12],
        [canvas.width * 0.88, canvas.height * 0.88],
        [canvas.width * 0.12, canvas.height * 0.88],
      ];
      setShot({ photo, corners: photoHint ?? inset });
      setMode("adjust");
    },
    [cols, rows, onDone, stopCamera],
  );

  // Gambar kamera + kisi, cari kisi berkala, ambil foto otomatis saat kisi stabil dan foto cukup jelas
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
        if (t - lastDetect > 400 && !taken) {
          lastDetect = t;
          const s = DETECT_WIDTH / vw;
          small.width = DETECT_WIDTH;
          small.height = Math.round(vh * s);
          small.getContext("2d", { willReadFrequently: true })!.drawImage(video, 0, 0, small.width, small.height);
          const frame = imageOf(small);
          const found = locateDrawnGrid(frame, cols, rows);
          const grid = found ? { ...found, corners: scaleQuad(found.corners, 1 / s) } : null;
          const prev = gridRef.current;
          const moved = grid && prev ? Math.max(...grid.corners.map((p, i) => Math.hypot(p[0] - prev.corners[i][0], p[1] - prev.corners[i][1]))) : Infinity;
          const problems = found ? qualityProblems(photoQuality(frame, quadBounds(found.corners))) : [];
          setLiveProblems((p) => (p.join() === problems.join() ? p : problems));
          stable = grid && moved < vw * 0.015 && !problems.length ? stable + 1 : grid ? 1 : 0;
          gridRef.current = grid;
          setState(!grid ? "search" : stable >= STABLE_HITS ? "locked" : "found");
          if (grid && stable >= STABLE_HITS) {
            taken = true;
            void takeShot(video, vw, vh, grid.corners);
          }
        }
        const grid = gridRef.current;
        if (grid) drawCells(ctx, grid, stable >= STABLE_HITS - 1 ? "locked" : "found", Math.max(2, vw / 400));
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, cols, rows, takeShot]);

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
    return <CornerAdjuster key={shot.photo.src} photo={shot.photo} cols={cols} rows={rows} initial={shot.corners} onRetake={() => void startCamera()} onConfirm={onDone} />;
  }

  if (mode === "quality" && review) {
    return (
      <QualityReview
        photo={review.photo}
        problems={review.problems}
        onRetake={() => void startCamera()}
        onContinue={() => void takeShot(review.photo.src, review.photo.width, review.photo.height, review.hint, true)}
      />
    );
  }

  return (
    <div className={styles.scanner}>
      {mode === "camera" ? (
        <div className={styles.live}>
          <video ref={videoRef} className={styles.hiddenVideo} playsInline muted />
          <canvas ref={canvasRef} className={styles.liveCanvas} aria-label="Kamera dengan kisi kotak" />
          <ScanAids tilt={tilt} problems={liveProblems} />
          <p className={styles.liveStatus} data-state={state} aria-live="polite">
            {state === "locked"
              ? "✓ Kisi ditemukan, memotret…"
              : state === "found"
                ? "Kisi ditemukan, tahan kamera tetap diam…"
                : `Arahkan kamera tepat di atas kisimu (${cols} kolom × ${rows} baris) sampai seluruh bingkai masuk layar.`}
          </p>
        </div>
      ) : mode === "locating" ? (
        <div className={styles.idle} aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Mencari garis-garis kisimu…</p>
        </div>
      ) : (
        <div className={styles.idle}>
          <span className={styles.idleIcon} aria-hidden="true">
            📷
          </span>
          <p className={styles.idleTitle}>{cameraError ? "Kamera tidak bisa dibuka" : "Siap memotret kisimu"}</p>
          <p>
            {cameraError
              ? "Izinkan akses kamera di pengaturan browser, atau unggah foto dari galeri."
              : "Kamera mencari bingkai kisi yang kamu gambar, memotret sendiri saat kamera diam dan fotonya jelas."}
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
                if (v?.videoWidth) void takeShot(v, v.videoWidth, v.videoHeight, gridRef.current?.corners ?? null);
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
            <span aria-hidden="true">☀️</span> Cahaya terang, tanpa bayangan HP atau tangan
          </li>
          <li>
            <span aria-hidden="true">⬇️</span> Kamera tepat di atas kertas, sejajar
          </li>
          <li>
            <span aria-hidden="true">🔲</span> Seluruh bingkai kisi masuk layar, sedekat mungkin
          </li>
        </ul>
      )}
      {fileInput}
    </div>
  );
}
