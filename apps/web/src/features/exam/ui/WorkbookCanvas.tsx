"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import type { CanvasStroke, GateChar } from "../data/workbookGateApi";
import styles from "./workbookGate.module.css";

/** Ukuran kanvas internal (piksel); tampilannya mengikuti lebar layar. */
const PAD = 320;
/** Titik per goresan yang dikirim: cukup untuk arah & lengkungan, badan permintaan tetap kecil. */
const MAX_POINTS = 48;

const SCRIPT_HINT: Record<GateChar["script"], string> = {
  hiragana: "Tulis dalam hiragana",
  katakana: "Tulis dalam katakana",
  kanji: "Tulis kanjinya",
};

type Pt = { x: number; y: number };

/** Kurangi titik goresan secara merata, tetap menyertakan titik awal dan akhir. */
function thin(stroke: Pt[]): CanvasStroke {
  const step = Math.max(1, Math.ceil(stroke.length / MAX_POINTS));
  const kept = stroke.filter((_, i) => i % step === 0 || i === stroke.length - 1);
  return kept.map((p) => [Math.round((p.x / PAD) * 1000) / 1000, Math.round((p.y / PAD) * 1000) / 1000]);
}

function inkStyle(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = getComputedStyle(ctx.canvas).color || "#1f1a1c";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function redraw(canvas: HTMLCanvasElement | null, strokes: Pt[][]) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, PAD, PAD);
  inkStyle(ctx);
  for (const s of strokes) {
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y);
    if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y + 0.1);
    for (const p of s.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

/**
 * Jalur kanvas Gerbang Tulis: satu huruf per layar, hanya bacaan & arti yang terlihat (ditulis dari ingatan).
 * Setiap goresan direkam berurutan supaya server bisa menilai urutan & arah goresan.
 */
export function WorkbookCanvas({
  chars,
  submitting,
  onSubmit,
}: {
  chars: GateChar[];
  submitting: boolean;
  onSubmit: (written: { char: string; strokes: CanvasStroke[] }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState<Pt[][][]>(() => chars.map(() => []));
  const [confirmBlank, setConfirmBlank] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<Pt[] | null>(null);
  const strokes = all[index];
  const item = chars[index];
  const blanks = all.filter((s) => !s.length).length;
  const last = index === chars.length - 1;

  useEffect(() => redraw(canvasRef.current, strokes), [strokes]);

  function setStrokes(next: Pt[][]) {
    setAll((prev) => prev.map((s, i) => (i === index ? next : s)));
  }

  function toCanvas(e: React.PointerEvent<HTMLCanvasElement>): Pt {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * PAD, y: ((e.clientY - rect.top) / rect.height) * PAD };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = [toCanvas(e)];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pts = drawingRef.current;
    if (!pts) return;
    pts.push(toCanvas(e));
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && pts.length > 1) {
      inkStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  }

  function onPointerUp() {
    const pts = drawingRef.current;
    drawingRef.current = null;
    if (pts) setStrokes([...strokes, pts]);
  }

  function go(to: number) {
    setConfirmBlank(false);
    setIndex(Math.max(0, Math.min(chars.length - 1, to)));
  }

  function submit() {
    if (blanks && !confirmBlank) {
      setConfirmBlank(true);
      return;
    }
    onSubmit(chars.map((c, i) => ({ char: c.char, strokes: all[i].map(thin) })));
  }

  return (
    <section className={styles.canvasStage} aria-label="Tulis di layar">
      <div className={styles.progressRow}>
        <span className={styles.progressLabel}>
          Huruf {index + 1} dari {chars.length}
        </span>
        <div className={styles.dots} role="group" aria-label="Pindah ke huruf">
          {chars.map((c, i) => (
            <button
              key={c.char}
              type="button"
              className={styles.dot}
              data-active={i === index || undefined}
              data-done={all[i].length > 0 || undefined}
              onClick={() => go(i)}
              aria-label={`Huruf ${i + 1}${all[i].length ? ", sudah ditulis" : ""}`}
              aria-current={i === index ? "step" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.prompt}>
        <span className={styles.promptHint}>{SCRIPT_HINT[item.script]}</span>
        <span className={styles.promptReading} lang="ja">
          {item.reading}
        </span>
        {item.meaning && <span className={styles.promptMeaning}>{item.meaning}</span>}
      </div>

      <div className={styles.padWrap}>
        <canvas
          ref={canvasRef}
          className={styles.pad}
          width={PAD}
          height={PAD}
          aria-label={`Kotak tulis untuk "${item.reading}". Tulis dengan jari atau stilus.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <p className={styles.strokeCount} aria-live="polite">
        {strokes.length} goresan
      </p>

      <div className={styles.padTools}>
        <Button variant="secondary" onClick={() => setStrokes(strokes.slice(0, -1))} disabled={!strokes.length}>
          Hapus goresan terakhir
        </Button>
        <Button variant="ghost" onClick={() => setStrokes([])} disabled={!strokes.length}>
          Ulangi huruf
        </Button>
      </div>

      {confirmBlank && (
        <p className={styles.warnText} role="status">
          Masih ada {blanks} huruf yang belum ditulis dan akan bernilai 0. Ketuk &quot;Kirim&quot; sekali lagi untuk tetap mengirim.
        </p>
      )}

      <div className={styles.navRow}>
        <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0 || submitting}>
          ← Sebelumnya
        </Button>
        {last ? (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Menilai…" : "Kirim & nilai"}
          </Button>
        ) : (
          <Button onClick={() => go(index + 1)} disabled={submitting}>
            Berikutnya →
          </Button>
        )}
      </div>
    </section>
  );
}
