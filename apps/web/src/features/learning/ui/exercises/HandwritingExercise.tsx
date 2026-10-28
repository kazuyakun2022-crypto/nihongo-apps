"use client";

import { useEffect, useRef, useState } from "react";
import {
  AUTO_ACCEPT_SCORE,
  prepareRecognizer,
  recognize,
  type Candidate,
  type Point,
  type Script,
  type Stroke,
} from "../../application/handwritingRecognizer";
import styles from "./exercises.module.css";

const PAD = 300;
/** Jeda setelah goresan terakhir sebelum huruf dianggap selesai ditulis. */
const AUTO_COMMIT_MS = 900;

function scriptOfChar(c: string): "hiragana" | "katakana" | undefined {
  if (/[ぁ-ゖ]/.test(c)) return "hiragana";
  if (/[ァ-ヺ]/.test(c)) return "katakana";
  return undefined;
}

/**
 * Menulis: siswa menulis satu huruf di kanvas; setelah berhenti sejenak, huruf yang paling mirip
 * otomatis masuk ke kotak jawaban berikutnya. Kandidat lain bisa diketuk untuk mengganti.
 */
export function HandwritingExercise({
  slots,
  script,
  kanji,
  answer,
  onAnswer,
}: {
  slots: number;
  script: Script;
  kanji: string[];
  answer: string | null;
  onAnswer: (answer: string) => void;
}) {
  const [chars, setChars] = useState<string[]>(() => {
    const saved = [...(answer ?? "")];
    return Array.from({ length: slots }, (_, i) => saved[i] ?? "");
  });
  const [cursor, setCursor] = useState(() => {
    const firstEmpty = [...(answer ?? "")].length;
    return Math.min(firstEmpty, slots - 1);
  });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  /** Kotak yang baru saja diisi otomatis — kandidatnya tetap ditampilkan agar bisa dikoreksi. */
  const [lastFilled, setLastFilled] = useState<{ slot: number; candidates: Candidate[] } | null>(null);
  const [ready, setReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<Point[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let alive = true;
    void prepareRecognizer(kanji).then(() => alive && setReady(true));
    return () => {
      alive = false;
      clearTimeout(timerRef.current);
    };
  }, [kanji]);

  useEffect(() => {
    redraw(canvasRef.current, strokes);
  }, [strokes]);

  function setSlots(next: string[]) {
    setChars(next);
    onAnswer(next.every(Boolean) ? next.join("") : "");
  }

  function commit(char: string, from: Candidate[]) {
    clearTimeout(timerRef.current);
    const next = [...chars];
    next[cursor] = char;
    setSlots(next);
    setLastFilled({ slot: cursor, candidates: from });
    setStrokes([]);
    setCandidates([]);
    const empty = next.findIndex((c, i) => !c && i > cursor);
    const anyEmpty = next.findIndex((c) => !c);
    setCursor(empty >= 0 ? empty : anyEmpty >= 0 ? anyEmpty : cursor);
  }

  function replaceLast(char: string) {
    if (!lastFilled) return;
    const next = [...chars];
    next[lastFilled.slot] = char;
    setSlots(next);
  }

  function runRecognition(list: Stroke[]) {
    if (!ready || list.length === 0) return;
    const before = chars.slice(0, cursor).reverse().map(scriptOfChar).find(Boolean);
    const found = recognize(list, { script, kanji: script === "campuran" ? kanji : [], padSize: PAD, preferScript: before });
    setCandidates(found);
    clearTimeout(timerRef.current);
    if (found[0] && found[0].score >= AUTO_ACCEPT_SCORE) {
      timerRef.current = setTimeout(() => commit(found[0].char, found), AUTO_COMMIT_MS);
    }
  }

  function toCanvas(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * PAD, y: ((e.clientY - rect.top) / rect.height) * PAD };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    clearTimeout(timerRef.current);
    setLastFilled(null);
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
    if (!pts) return;
    const next = [...strokes, pts];
    setStrokes(next);
    runRecognition(next);
  }

  function undoStroke() {
    const next = strokes.slice(0, -1);
    setStrokes(next);
    if (next.length) runRecognition(next);
    else {
      clearTimeout(timerRef.current);
      setCandidates([]);
    }
  }

  function clearPad() {
    clearTimeout(timerRef.current);
    setStrokes([]);
    setCandidates([]);
  }

  function selectSlot(i: number) {
    clearPad();
    setLastFilled(null);
    setCursor(i);
    if (chars[i]) {
      const next = [...chars];
      next[i] = "";
      setSlots(next);
    }
  }

  function backspace() {
    clearPad();
    setLastFilled(null);
    const last = chars.map((c, i) => (c ? i : -1)).filter((i) => i >= 0).pop();
    if (last === undefined) return;
    const next = [...chars];
    next[last] = "";
    setSlots(next);
    setCursor(last);
  }

  const shownCandidates = candidates.length ? candidates : lastFilled?.candidates ?? [];
  const activeChar = candidates.length ? undefined : lastFilled ? chars[lastFilled.slot] : undefined;
  const scriptLabel = script === "hiragana" ? "hiragana" : script === "katakana" ? "katakana" : "huruf Jepang";

  return (
    <div className={styles.writeWrap}>
      <div className={styles.slots} role="group" aria-label="Kotak jawaban">
        {chars.map((c, i) => (
          <button
            key={i}
            type="button"
            className={styles.slot}
            data-active={i === cursor}
            data-filled={!!c}
            lang="ja"
            onClick={() => selectSlot(i)}
            aria-label={c ? `Huruf ${i + 1}: ${c}, ketuk untuk menulis ulang` : `Kotak ${i + 1}, kosong`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className={styles.padWrap}>
        <canvas
          ref={canvasRef}
          width={PAD}
          height={PAD}
          className={styles.pad}
          aria-label={`Area menulis. Tulis satu huruf ${scriptLabel} untuk kotak ke-${cursor + 1}.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {!ready && <span className={styles.padNote}>Menyiapkan pengenal huruf…</span>}
        {ready && strokes.length === 0 && !lastFilled && <span className={styles.padNote}>Tulis huruf ke-{cursor + 1} di sini</span>}
      </div>

      <div className={styles.candidateRow} aria-live="polite">
        {shownCandidates.length > 0 ? (
          <>
            <span className={styles.muted}>{lastFilled && !candidates.length ? "Bukan itu?" : "Mirip:"}</span>
            {shownCandidates.map((c) => (
              <button
                key={c.char}
                type="button"
                className={styles.candidate}
                data-active={c.char === activeChar}
                lang="ja"
                onClick={() => (candidates.length ? commit(c.char, candidates) : replaceLast(c.char))}
              >
                {c.char}
              </button>
            ))}
          </>
        ) : (
          strokes.length > 0 && <span className={styles.muted}>Belum mirip huruf apa pun — lanjutkan atau hapus coretan.</span>
        )}
      </div>

      <div className={styles.padActions}>
        <button type="button" className={styles.padBtn} onClick={undoStroke} disabled={!strokes.length}>
          Urungkan goresan
        </button>
        <button type="button" className={styles.padBtn} onClick={clearPad} disabled={!strokes.length}>
          Hapus coretan
        </button>
        <button type="button" className={styles.padBtn} onClick={backspace} disabled={!chars.some(Boolean)}>
          ⌫ Hapus huruf
        </button>
      </div>
    </div>
  );
}

function inkStyle(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = getComputedStyle(ctx.canvas).color || "#1f1a1c";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function redraw(canvas: HTMLCanvasElement | null, strokes: Stroke[]) {
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
