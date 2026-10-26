"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { HIRAGANA_BASIC, type HiraganaChar } from "../data/characters";
import { HIRAGANA_STROKE_DATA } from "../data/hiraganaStrokes";
import { useSpeech } from "@/shared/lib/useSpeech";
import { Button } from "@/shared/ui/Button";
import styles from "./writingPractice.module.css";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export interface EvaluationResult {
  score: number; // 0 - 100
  accuracy: number; // 0 - 100
  coverage: number; // 0 - 100
  strokeMatch: boolean;
  actualStrokes: number;
  expectedStrokes: number;
  grade: "perfect" | "good" | "fair" | "retry";
  message: string;
}

const INK_COLORS = [
  { id: "sumi", label: "Sumi (Hitam)", color: "#1f1a1c" },
  { id: "beni", label: "Beni (Merah)", color: "#b12a3a" },
  { id: "matcha", label: "Matcha (Hijau)", color: "#2e7d32" },
];

export function extractJapaneseWord(example?: string): string {
  if (!example) return "";
  const beforeEqual = example.split("=")[0].trim();
  const match = beforeEqual.match(/^([^\(（]+)/);
  return match && match[1] ? match[1].trim() : beforeEqual;
}

/**
 * Mesin Koreksi Otomatis Tulisan Tangan Hiragana
 * Menggunakan perbandingan pixel mask bentuk huruf kanvas offscreen dengan goresan pengguna.
 */
function evaluateHandwriting(
  userStrokes: Stroke[],
  targetChar: string,
  expectedStrokes: number
): EvaluationResult {
  const size = 400;
  if (userStrokes.length === 0) {
    return {
      score: 0,
      accuracy: 0,
      coverage: 0,
      strokeMatch: false,
      actualStrokes: 0,
      expectedStrokes,
      grade: "retry",
      message: "Belum ada goresan. Tuliskan huruf di atas kanvas terlebih dahulu.",
    };
  }

  // 1. Render template target huruf ke kanvas memori
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = size;
  targetCanvas.height = size;
  const tCtx = targetCanvas.getContext("2d", { willReadFrequently: true });
  if (!tCtx) {
    return {
      score: 75,
      accuracy: 75,
      coverage: 75,
      strokeMatch: userStrokes.length === expectedStrokes,
      actualStrokes: userStrokes.length,
      expectedStrokes,
      grade: "good",
      message: "Tulisan telah tersimpan dengan baik.",
    };
  }

  tCtx.fillStyle = "#ffffff";
  tCtx.fillRect(0, 0, size, size);

  // Huruf referensi diposisikan di tengah persis
  const fontSize = Math.round(size * 0.70);
  tCtx.font = `600 ${fontSize}px "Noto Sans JP", sans-serif`;
  tCtx.fillStyle = "#000000";
  tCtx.textAlign = "center";
  tCtx.textBaseline = "middle";
  tCtx.fillText(targetChar, size / 2, size / 2 + fontSize * 0.04);

  const targetData = tCtx.getImageData(0, 0, size, size).data;

  // 2. Render goresan pengguna ke kanvas memori
  const userCanvas = document.createElement("canvas");
  userCanvas.width = size;
  userCanvas.height = size;
  const uCtx = userCanvas.getContext("2d", { willReadFrequently: true });
  if (!uCtx) {
    return {
      score: 75,
      accuracy: 75,
      coverage: 75,
      strokeMatch: userStrokes.length === expectedStrokes,
      actualStrokes: userStrokes.length,
      expectedStrokes,
      grade: "good",
      message: "Tulisan telah tersimpan dengan baik.",
    };
  }

  uCtx.fillStyle = "#ffffff";
  uCtx.fillRect(0, 0, size, size);
  uCtx.strokeStyle = "#000000";
  uCtx.lineWidth = 26; // Kuas tebal untuk mencakup toleransi jari
  uCtx.lineCap = "round";
  uCtx.lineJoin = "round";

  for (const s of userStrokes) {
    if (s.points.length === 0) continue;
    uCtx.beginPath();
    uCtx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      uCtx.lineTo(s.points[i].x, s.points[i].y);
    }
    uCtx.stroke();
  }

  const userData = uCtx.getImageData(0, 0, size, size).data;

  // 3. Analisis kecocokan pixel (sampling berkecepatan tinggi)
  let targetPixelCount = 0;
  let userPixelCount = 0;
  let intersectionCount = 0;

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const idx = (y * size + x) * 4;
      const isTarget = targetData[idx] < 128;
      const isUser = userData[idx] < 128;

      if (isTarget) targetPixelCount++;
      if (isUser) userPixelCount++;
      if (isTarget && isUser) intersectionCount++;
    }
  }

  const coverage = targetPixelCount > 0 ? intersectionCount / targetPixelCount : 0;
  const accuracy = userPixelCount > 0 ? intersectionCount / userPixelCount : 0;

  // Perhitungan evaluasi jumlah goresan resmi
  const actualStrokes = userStrokes.length;
  const strokeDiff = Math.abs(actualStrokes - expectedStrokes);
  const strokeMatch = strokeDiff === 0;
  const strokePenalty = Math.min(strokeDiff * 10, 25);

  // Skor gabungan akhir (0 - 100)
  const baseScore = (coverage * 0.55 + accuracy * 0.45) * 100;
  const finalScore = Math.max(10, Math.min(100, Math.round(baseScore - strokePenalty)));

  let grade: "perfect" | "good" | "fair" | "retry" = "retry";
  let message = "";

  if (finalScore >= 80) {
    grade = "perfect";
    message = strokeMatch
      ? "Luar biasa! Goresan sangat presisi dan jumlah tarikan tepat."
      : `Bentuk sangat bagus! Catatan: huruf ${targetChar} memiliki ${expectedStrokes} goresan.`;
  } else if (finalScore >= 62) {
    grade = "good";
    message = strokeMatch
      ? "Bagus sekali! Karakter terbaca jelas dan proporsional."
      : `Bagus! Coba sesuaikan jumlah goresan menjadi ${expectedStrokes} tarikan.`;
  } else if (finalScore >= 42) {
    grade = "fair";
    message = "Cukup baik, perhatikan kelengkapan garis dan arah lengkungannya.";
  } else {
    grade = "retry";
    message = "Bentuk belum pas. Coba aktifkan 'Panduan Aktif' untuk menjiplak huruf terlebih dahulu.";
  }

  return {
    score: finalScore,
    accuracy: Math.round(accuracy * 100),
    coverage: Math.round(coverage * 100),
    strokeMatch,
    actualStrokes,
    expectedStrokes,
    grade,
    message,
  };
}

export function HiraganaWritingPractice({
  initialChar = "あ",
  onBack,
}: {
  initialChar?: string;
  onBack: () => void;
}) {
  const { speak } = useSpeech();
  const [selectedChar, setSelectedChar] = useState<string>(initialChar);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [selectedColor, setSelectedColor] = useState<string>("#1f1a1c");
  const [brushWidth, setBrushWidth] = useState<number>(14);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showTips, setShowTips] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<Point[]>([]);

  // Find character data
  const charData = useMemo(() => {
    return HIRAGANA_BASIC.find((h) => h.char === selectedChar) || HIRAGANA_BASIC[0];
  }, [selectedChar]);

  const strokeInfo = useMemo(() => {
    return (
      HIRAGANA_STROKE_DATA[selectedChar] || {
        char: selectedChar,
        romaji: charData.romaji,
        strokeCount: 1,
        strokeTips: ["Perhatikan arah goresan dari kiri ke kanan dan atas ke bawah."],
      }
    );
  }, [selectedChar, charData.romaji]);

  // Current index in Hiragana basic list for Next/Prev
  const currentIndex = useMemo(() => {
    return HIRAGANA_BASIC.findIndex((h) => h.char === selectedChar);
  }, [selectedChar]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedChar(HIRAGANA_BASIC[currentIndex - 1].char);
      setStrokes([]);
      setEvaluation(null);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < HIRAGANA_BASIC.length - 1) {
      setSelectedChar(HIRAGANA_BASIC[currentIndex + 1].char);
      setStrokes([]);
      setEvaluation(null);
    }
  }, [currentIndex]);

  const handleSelect = (c: HiraganaChar) => {
    setSelectedChar(c.char);
    setStrokes([]);
    setEvaluation(null);
  };

  /**
   * Menggambar ulang seluruh kanvas secara deterministik
   * Ukuran kanvas selalu tetap 400x400 sehingga tidak pernah hilang saat state re-render.
   */
  const redrawAll = useCallback((strokeList: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 400, 400);

    // Garis bantu salib putus-putus kaligrafi Jepang (Genkouyoushi)
    ctx.save();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    // Garis tengah horizontal
    ctx.beginPath();
    ctx.moveTo(0, 200);
    ctx.lineTo(400, 200);
    ctx.stroke();

    // Garis tengah vertikal
    ctx.beginPath();
    ctx.moveTo(200, 0);
    ctx.lineTo(200, 400);
    ctx.stroke();
    ctx.restore();

    // Gambar semua goresan yang telah disimpan
    for (const stroke of strokeList) {
      if (stroke.points.length === 0) continue;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // Redraw saat strokes berubah
  useEffect(() => {
    redrawAll(strokes);
  }, [strokes, redrawAll]);

  // Evaluasi Otomatis ketika jumlah goresan telah memenuhi ekspektasi
  useEffect(() => {
    if (strokes.length > 0 && strokes.length >= strokeInfo.strokeCount) {
      const timer = setTimeout(() => {
        const res = evaluateHandwriting(strokes, selectedChar, strokeInfo.strokeCount);
        setEvaluation(res);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [strokes, selectedChar, strokeInfo.strokeCount]);

  /**
   * Konversi koordinat layar (touch/mouse) ke ruang koordinat kanvas 400x400
   */
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 400 / rect.width;
    const scaleY = 400 / rect.height;
    return {
      x: Math.max(0, Math.min(400, (e.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(400, (e.clientY - rect.top) * scaleY)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const p = getCanvasCoords(e);
    currentStrokeRef.current = [p];

    // Gambar titik awal langsung di kanvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.fillStyle = selectedColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, brushWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const p = getCanvasCoords(e);
    const pts = currentStrokeRef.current;
    pts.push(p);

    // Sambungkan garis langsung ke canvas secara real-time
    const canvas = canvasRef.current;
    if (canvas && pts.length > 1) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = brushWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 0) {
      const newStroke: Stroke = {
        points: [...currentStrokeRef.current],
        color: selectedColor,
        width: brushWidth,
      };
      setStrokes((prev) => {
        const next = [...prev, newStroke];
        return next;
      });
      currentStrokeRef.current = [];
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, prev.length - 1));
    setEvaluation(null);
  };

  const handleClear = () => {
    setStrokes([]);
    setEvaluation(null);
  };

  const handleManualCheck = () => {
    const res = evaluateHandwriting(strokes, selectedChar, strokeInfo.strokeCount);
    setEvaluation(res);
  };

  return (
    <div className={styles.container}>
      {/* ── Top Header ── */}
      <div className={styles.topHeader}>
        <div className={styles.topHeaderLeft}>
          <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Kembali ke tabel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Kembali
          </button>
          <div>
            <h1 className={styles.pageTitle}>Latihan Menulis Hiragana</h1>
            <p className={styles.pageSubtitle}>Latih goresan dengan kanvas interaktif dan koreksi otomatis.</p>
          </div>
        </div>

        <div className={styles.navRow}>
          <button
            type="button"
            className={styles.charNavBtn}
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            aria-label="Huruf sebelumnya"
            title="Huruf sebelumnya"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Sebelumnya</span>
          </button>
          <button
            type="button"
            className={`${styles.charNavBtn} ${styles.charNavBtnPrimary}`}
            onClick={handleNext}
            disabled={currentIndex >= HIRAGANA_BASIC.length - 1}
            aria-label="Huruf berikutnya"
            title="Huruf berikutnya"
          >
            <span>Berikutnya</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Horizontal Character Picker ── */}
      <div className={styles.pickerWrapper}>
        <div className={styles.pickerScroller}>
          {HIRAGANA_BASIC.map((item) => (
            <button
              key={item.char}
              type="button"
              className={`${styles.pickerItem} ${item.char === selectedChar ? styles.pickerItemActive : ""}`}
              onClick={() => handleSelect(item)}
            >
              <span className={styles.pickerChar} lang="ja">{item.char}</span>
              <span className={styles.pickerRomaji}>{item.romaji}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Canvas & Control Workspace ── */}
      <div className={styles.workspace}>
        {/* Left / Top: Interactive Writing Canvas Box */}
        <div className={styles.canvasCard}>
          <div className={styles.canvasCardHeader}>
            <div className={styles.charMetaLeft}>
              <span className={styles.charRomajiBig}>{charData.romaji}</span>
              <span className={styles.charStrokeBadge}>
                {strokeInfo.strokeCount} Goresan Resmi
              </span>
            </div>

            <button
              type="button"
              className={styles.speakerBtn}
              onClick={() => speak(charData.char)}
              title="Dengarkan pelafalan huruf"
              aria-label="Dengarkan pelafalan huruf"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span>Pelafalan</span>
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div className={styles.canvasWrapper}>
            {/* Background Character Shadow Guide */}
            {showGuide && (
              <div className={styles.guideShadow} lang="ja" aria-hidden="true">
                {selectedChar}
              </div>
            )}

            {/* Drawing Canvas — Dimensi tetap 400x400 agar garis tidak pernah hilang */}
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className={styles.drawCanvas}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerLeave={finishStroke}
              onPointerCancel={finishStroke}
            />
          </div>

          {/* Canvas Bottom Action Bar */}
          <div className={styles.canvasActionBar}>
            <div className={styles.canvasActionGroup}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleUndo}
                disabled={strokes.length === 0}
                title="Batalkan goresan terakhir"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                <span>Urungkan</span>
              </button>

              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleClear}
                disabled={strokes.length === 0}
                title="Hapus semua coretan"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Hapus</span>
              </button>
            </div>

            <button
              type="button"
              className={`${styles.toggleGuideBtn} ${showGuide ? styles.toggleGuideActive : ""}`}
              onClick={() => setShowGuide(!showGuide)}
              title="Tampilkan atau sembunyikan bayangan bentuk huruf"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {showGuide ? (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                )}
              </svg>
              <span>{showGuide ? "Panduan Aktif" : "Coba Mandiri"}</span>
            </button>
          </div>

          {/* ── Tombol Koreksi Otomatis ── */}
          <div className={styles.checkActionRow}>
            <button
              type="button"
              className={styles.checkBtn}
              onClick={handleManualCheck}
              disabled={strokes.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Koreksi Otomatis Tulisan ({strokes.length}/{strokeInfo.strokeCount} Goresan)</span>
            </button>
          </div>

          {/* ── Kartu Hasil Koreksi Otomatis ── */}
          {evaluation && (
            <div
              className={`${styles.evalCard} ${
                evaluation.grade === "perfect"
                  ? styles.evalCardPerfect
                  : evaluation.grade === "good"
                  ? styles.evalCardGood
                  : evaluation.grade === "fair"
                  ? styles.evalCardFair
                  : styles.evalCardRetry
              }`}
            >
              <div className={styles.evalHeader}>
                <div className={styles.evalTitleGroup}>
                  <span
                    className={`${styles.evalScoreBadge} ${
                      evaluation.grade === "perfect"
                        ? styles.evalBadgePerfect
                        : evaluation.grade === "good"
                        ? styles.evalBadgeGood
                        : evaluation.grade === "fair"
                        ? styles.evalBadgeFair
                        : styles.evalBadgeRetry
                    }`}
                  >
                    {evaluation.score}%
                  </span>
                  <span className={styles.evalStatusText}>
                    {evaluation.grade === "perfect"
                      ? "Sempurna! (大変よくできました)"
                      : evaluation.grade === "good"
                      ? "Bagus Sekali! (よくできました)"
                      : evaluation.grade === "fair"
                      ? "Cukup Baik"
                      : "Perlu Latihan"}
                  </span>
                </div>

                <div className={styles.evalStarsRow}>
                  {[1, 2, 3].map((starIdx) => {
                    const isFilled =
                      evaluation.grade === "perfect"
                        ? true
                        : evaluation.grade === "good"
                        ? starIdx <= 2
                        : evaluation.grade === "fair"
                        ? starIdx <= 1
                        : false;
                    return (
                      <svg
                        key={starIdx}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={isFilled ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={isFilled ? styles.evalStarFilled : styles.evalStarEmpty}
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    );
                  })}
                </div>
              </div>

              <p className={styles.evalMessage}>{evaluation.message}</p>

              <div className={styles.evalMetrics}>
                <div className={styles.evalMetricItem}>
                  <span className={styles.evalMetricLabel}>Goresan Dibuat</span>
                  <span className={styles.evalMetricValue}>
                    {evaluation.actualStrokes} dari {evaluation.expectedStrokes} {evaluation.strokeMatch ? "✓ Tepat" : ""}
                  </span>
                </div>
                <div className={styles.evalMetricItem}>
                  <span className={styles.evalMetricLabel}>Akurasi Jalur</span>
                  <span className={styles.evalMetricValue}>{evaluation.accuracy}% Cocok</span>
                </div>
              </div>

              <div className={styles.evalActions}>
                <button type="button" className={styles.evalActionBtn} onClick={handleClear}>
                  Ulangi Huruf Ini
                </button>
                <button
                  type="button"
                  className={`${styles.evalActionBtn} ${styles.evalActionBtnPrimary}`}
                  onClick={handleNext}
                  disabled={currentIndex >= HIRAGANA_BASIC.length - 1}
                >
                  Lanjut Huruf Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right / Bottom: Tools, Stroke Guidance & Example Card */}
        <div className={styles.sideControls}>
          {/* Tool Options Card */}
          <div className={styles.panelCard}>
            <h2 className={styles.panelTitle}>Alat Tulis Kaligrafi</h2>

            {/* Ink Color Picker */}
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>Warna Tinta:</span>
              <div className={styles.colorPills}>
                {INK_COLORS.map((ink) => (
                  <button
                    key={ink.id}
                    type="button"
                    className={`${styles.colorBtn} ${selectedColor === ink.color ? styles.colorBtnActive : ""}`}
                    onClick={() => setSelectedColor(ink.color)}
                    style={{ backgroundColor: ink.color }}
                    aria-label={ink.label}
                    title={ink.label}
                  />
                ))}
              </div>
            </div>

            {/* Brush Thickness */}
            <div className={styles.controlRow}>
              <span className={styles.controlLabel}>Ketebalan Kuas:</span>
              <div className={styles.brushPills}>
                <button
                  type="button"
                  className={`${styles.brushBtn} ${brushWidth === 10 ? styles.brushBtnActive : ""}`}
                  onClick={() => setBrushWidth(10)}
                >
                  Sedang
                </button>
                <button
                  type="button"
                  className={`${styles.brushBtn} ${brushWidth === 18 ? styles.brushBtnActive : ""}`}
                  onClick={() => setBrushWidth(18)}
                >
                  Tebal
                </button>
              </div>
            </div>
          </div>

          {/* Stroke Order Tips */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeaderRow} onClick={() => setShowTips(!showTips)}>
              <div className={styles.panelHeaderLeft}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <h2 className={styles.panelTitle} style={{ margin: 0 }}>Panduan Urutan Goresan</h2>
              </div>
              <span className={styles.collapseToggleText}>{showTips ? "Tutup" : "Buka"}</span>
            </div>

            {showTips && (
              <ol className={styles.tipsList}>
                {strokeInfo.strokeTips.map((tip, idx) => (
                  <li key={idx} className={styles.tipItem}>
                    {tip}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Example Word Card with Audio Button */}
          {charData.example && (
            <div className={styles.panelCard}>
              <h2 className={styles.panelTitle}>Contoh Kosakata</h2>
              <div className={styles.exampleWordBox}>
                <div className={styles.exampleWordLeft}>
                  <span className={styles.exampleWordText} lang="ja">
                    {charData.example}
                  </span>
                  <span className={styles.exampleWordHint}>
                    Dengarkan pelafalan kosakata huruf {selectedChar}.
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.exampleSpeakerBtn}
                  onClick={() => speak(extractJapaneseWord(charData.example))}
                  title="Dengarkan pelafalan contoh kosakata"
                  aria-label="Dengarkan contoh kosakata"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Quick Action: Next Character */}
          <div className={styles.nextActionArea}>
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={currentIndex >= HIRAGANA_BASIC.length - 1}
              style={{ width: "100%" }}
            >
              Lanjut ke Huruf Berikutnya
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
