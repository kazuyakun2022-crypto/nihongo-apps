"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mascot } from "@/shared/ui/Mascot";
import { useNavigator } from "../application/NavigatorProvider";
import { linesFor, type Say } from "../domain/tours";
import { Reveal } from "./Reveal";
import styles from "./navigator.module.css";

const PAD = 8;
const MARGIN = 12;
const GAP = 16;
/** Halaman tujuan bisa butuh waktu dimuat (terutama saat pertama dibuka di mode dev). */
const FIND_TIMEOUT_MS = 12000;

type Rect = { top: number; left: number; width: number; height: number };
type Place = "below" | "above" | "over" | "center";
type CardPos = { left: number; top: number; place: Place; notch: number };
type Status = "finding" | "ok" | "missing";

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

/**
 * Tur Miu-chan: layar digelapkan kecuali elemen yang sedang dijelaskan, lalu kartu penjelas menempel di dekatnya.
 * Sorotan meluncur halus dari satu elemen ke elemen berikutnya. Pada langkah "ketuk", hanya target yang bisa diketuk;
 * pada langkah penjelasan, layar dikunci supaya pengguna membaca dulu lalu menekan Lanjut.
 */
export function SpotlightOverlay() {
  const nav = useNavigator();
  const { tour, tourNext, endTour, speakLine, band } = nav;
  const step = tour ? tour.steps[tour.index] : null;

  const [status, setStatus] = useState<Status>("finding");
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<CardPos | null>(null);
  const [shaking, setShaking] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const spokenSeq = useRef(-1);

  const alt = resolvedId ? step?.alt?.[resolvedId] : undefined;
  const say: Say | null = step ? alt?.say ?? step.say : null;
  const lines = say ? linesFor(say, band) : null;
  const missingText = step?.missing ?? "Bagian ini belum tampil di layarmu. Tidak apa-apa, kita lanjut saja.";

  // Cari target langkah ini, gulir ke sana, dan pantau posisinya setiap frame
  useEffect(() => {
    if (!tour || !step) return;
    setStatus("finding");
    setResolvedId(null);
    elRef.current = null;
    const targets = step.target === null ? [] : Array.isArray(step.target) ? step.target : [step.target];
    let stopped = false;
    let frame = 0;
    let timer = 0;
    let lostAt = 0;
    const started = performance.now();

    const onTargetClick = () => {
      if (step.click) window.setTimeout(() => !stopped && tourNext(), 60);
    };

    const place = () => {
      if (stopped) return;
      const el = elRef.current;
      let r: Rect | null = null;
      if (el) {
        if (!el.isConnected) {
          // Elemen diganti saat render ulang: cari lagi sebentar; kalau benar-benar hilang, tur berhenti
          lostAt ||= performance.now();
          const again = targets.map((t) => document.querySelector<HTMLElement>(`[data-spotlight="${t}"]`)).find(Boolean);
          if (again) {
            elRef.current = again;
            again.addEventListener("click", onTargetClick);
            lostAt = 0;
          } else if (performance.now() - lostAt > 1500) {
            endTour(false);
            return;
          }
        } else {
          const b = el.getBoundingClientRect();
          r = { top: b.top, left: b.left, width: b.width, height: b.height };
        }
      }
      setRect((prev) => (sameRect(prev, r) ? prev : r));

      const card = cardRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = card?.offsetWidth ?? 320;
      const h = card?.offsetHeight ?? 180;
      let next: CardPos;
      if (!r) {
        next = { left: (vw - w) / 2, top: Math.max(MARGIN, (vh - h) / 2), place: "center", notch: w / 2 };
      } else {
        const bottom = r.top + r.height + PAD;
        const top = r.top - PAD;
        const cx = r.left + r.width / 2;
        const left = Math.min(Math.max(MARGIN, cx - w / 2), vw - w - MARGIN);
        const notch = Math.min(Math.max(24, cx - left), w - 24);
        if (bottom + GAP + h <= vh - MARGIN) next = { left, top: bottom + GAP, place: "below", notch };
        else if (top - GAP - h >= MARGIN) next = { left, top: top - GAP - h, place: "above", notch };
        else next = { left, top: vh - h - MARGIN, place: "over", notch };
      }
      setPos((p) => (p && Math.abs(p.left - next.left) < 0.5 && Math.abs(p.top - next.top) < 0.5 && p.place === next.place && Math.abs(p.notch - next.notch) < 0.5 ? p : next));
      frame = requestAnimationFrame(place);
    };

    const find = () => {
      if (stopped) return;
      if (step.skipIfPresent && document.querySelector(`[data-spotlight="${step.skipIfPresent}"]`)) {
        tourNext();
        return;
      }
      if (targets.length === 0) {
        setStatus("ok");
        return;
      }
      for (const id of targets) {
        const el = document.querySelector<HTMLElement>(`[data-spotlight="${id}"]`);
        if (!el) continue;
        elRef.current = el;
        setResolvedId(id);
        setStatus("ok");
        const b = el.getBoundingClientRect();
        if (b.top < 80 || b.bottom > window.innerHeight - 120) el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.addEventListener("click", onTargetClick);
        return;
      }
      if (performance.now() - started < FIND_TIMEOUT_MS) timer = window.setTimeout(find, 150);
      else setStatus("missing");
    };

    find();
    frame = requestAnimationFrame(place);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      elRef.current?.removeEventListener("click", onTargetClick);
    };
    // Dijalankan ulang hanya saat langkah berganti
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.seq]);

  // Bacakan langkah begitu targetnya ketemu (atau dinyatakan tidak ada), sekali per langkah
  useEffect(() => {
    if (!tour || status === "finding" || spokenSeq.current === tour.seq) return;
    spokenSeq.current = tour.seq;
    speakLine(status === "missing" ? missingText : lines?.speech ?? "");
  }, [tour, status, lines?.speech, missingText, speakLine]);

  useEffect(() => {
    if (!tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endTour(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour, endTour]);

  if (!tour || !step || !lines) return null;

  const total = tour.steps.length;
  const prevIndex = tour.history[tour.history.length - 1];
  const canBack = prevIndex !== undefined && !tour.steps[prevIndex].click;
  const isEnd = !!alt?.end || tour.index === total - 1;
  const clickStep = !!step.click && status === "ok" && !!rect;
  const speaking = nav.voiceState === "SPEAKING";

  const hole = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };

  const nudge = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 450);
  };

  const tapForMe = () => {
    const el = elRef.current;
    if (el) el.click();
    else tourNext();
  };

  return createPortal(
    <div className={styles.spot} data-tour>
      {/* Sorotan: satu lubang dengan bayangan raksasa, jadi bisa meluncur halus antar langkah */}
      <div className={styles.hole} data-empty={!rect || undefined} data-tap={clickStep || undefined} style={hole} aria-hidden />

      {/* Penahan klik: langkah "ketuk" membiarkan target bisa diketuk, langkah penjelasan mengunci layar */}
      {clickStep ? (
        <>
          <div className={styles.block} style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} onClick={nudge} />
          <div className={styles.block} style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} onClick={nudge} />
          <div className={styles.block} style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }} onClick={nudge} />
          <div className={styles.block} style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} onClick={nudge} />
          <span className={styles.tapHand} style={{ top: hole.top + hole.height - 14, left: hole.left + hole.width - 18 }} aria-hidden>
            👆
          </span>
        </>
      ) : (
        <div className={styles.block} style={{ inset: 0 }} onClick={nudge} />
      )}

      <div
        ref={cardRef}
        className={styles.card}
        data-place={pos?.place ?? "center"}
        data-shake={shaking || undefined}
        style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, "--notch": `${pos?.notch ?? 0}px` } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={`Tur Miu-chan: ${tour.title}`}
      >
        <div className={styles.cardMascot} data-speaking={speaking || undefined} key={tour.seq}>
          <Mascot mood={status === "finding" ? "berpikir" : "semangat"} size={64} title="" />
        </div>

        <header className={styles.cardHead}>
          <span className={styles.cardTitle}>{tour.title}</span>
          <button type="button" className={styles.cardClose} onClick={() => endTour(false)} aria-label="Tutup tur">
            ×
          </button>
        </header>

        <div className={styles.cardBody} key={`${tour.seq}-${status}`} aria-live="polite">
          {status === "finding" ? (
            <p className={styles.finding}>
              Sebentar, Miu-chan cari bagiannya dulu
              <span className={styles.findingDots} aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </p>
          ) : status === "missing" ? (
            <p className={styles.tMain}>
              <Reveal text={missingText} />
            </p>
          ) : lines.main === "id" ? (
            <>
              <p className={styles.tJa} lang="ja">
                {lines.ja}
              </p>
              {lines.romaji && <p className={styles.tRomaji}>{lines.romaji}</p>}
              <p className={styles.tMain}>
                <Reveal text={lines.id} />
              </p>
            </>
          ) : (
            <>
              <p className={`${styles.tMain} ${styles.tMainJa}`} lang="ja">
                <Reveal text={lines.ja} />
              </p>
              {lines.idCollapsed ? (
                <details className={styles.tDetails}>
                  <summary>Terjemahan</summary>
                  <p>{lines.id}</p>
                </details>
              ) : (
                <p className={styles.tSub}>{lines.id}</p>
              )}
            </>
          )}
          {clickStep && <p className={styles.tapHint}>Ketuk bagian yang bersinar untuk lanjut.</p>}
        </div>

        <footer className={styles.cardFoot}>
          <ol className={styles.dots} aria-label={`Langkah ${tour.index + 1} dari ${total}`}>
            {tour.steps.map((_, i) => (
              <li key={i} data-state={i < tour.index ? "done" : i === tour.index ? "now" : undefined} />
            ))}
          </ol>
          <div className={styles.cardActions}>
            {canBack && (
              <button type="button" className={styles.btnGhost} onClick={nav.tourBack}>
                Kembali
              </button>
            )}
            {clickStep ? (
              <button type="button" className={styles.btnSoft} onClick={tapForMe}>
                Ketukkan untukku
              </button>
            ) : isEnd && status !== "missing" ? (
              <button type="button" className={styles.btnMain} onClick={() => endTour(true)}>
                Selesai
              </button>
            ) : (
              <button type="button" className={styles.btnMain} onClick={tourNext} disabled={status === "finding"}>
                {status === "missing" ? "Lewati" : "Lanjut"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
