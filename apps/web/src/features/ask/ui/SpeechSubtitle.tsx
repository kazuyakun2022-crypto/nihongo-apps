"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SpeechRun, VoiceEmotion } from "../application/useVoiceChat";
import styles from "./subtitle.module.css";

interface Token {
  text: string;
  /** Kata yang disorot saat diucapkan; spasi dan tanda baca hanya memberi jeda. */
  spoken: boolean;
  /** Akhir rentang waktu token ini, sebagai pecahan 0–1 dari seluruh ucapan. */
  end: number;
}

const JAPANESE = /[぀-ヿ一-鿿々ー]/;
const LONG_PAUSE = /[.!?。！？…~〜]/;
const SHORT_PAUSE = /[,、;:；：]/;
// Perkiraan kecepatan bicara bila durasi audio belum diketahui
const MS_PER_WEIGHT = 55;

/** Bobot lama ucapan: satu huruf Jepang ≈ satu mora, kira-kira dua kali huruf latin. */
function weightOf(text: string, spoken: boolean): number {
  if (!spoken) {
    if (LONG_PAUSE.test(text)) return 6;
    if (SHORT_PAUSE.test(text)) return 3;
    return text.trim() ? 1 : 0.5;
  }
  let w = 0;
  for (const ch of text) w += JAPANESE.test(ch) ? 2 : 1;
  return w;
}

function segment(text: string): { text: string; spoken: boolean }[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    // Segmenter memecah kalimat Jepang (tanpa spasi) dan Indonesia sekaligus
    const seg = new Intl.Segmenter(["ja", "id"], { granularity: "word" });
    return Array.from(seg.segment(text), (s) => ({ text: s.segment, spoken: !!s.isWordLike }));
  }
  return text.split(/(\s+)/).filter(Boolean).map((t) => ({ text: t, spoken: /\S/.test(t) }));
}

/** Bagian yang dibacakan pelan memakan waktu lebih lama, jadi bobotnya dibagi tempo bagian itu. */
function tokenize(text: string, runs?: SpeechRun[]): { tokens: Token[]; totalWeight: number } {
  const pieces = runs?.length ? runs : [{ text, tempo: 1 }];
  const parts = pieces.flatMap((r) => segment(r.text).map((p) => ({ ...p, tempo: r.tempo || 1 })));
  const weights = parts.map((p) => weightOf(p.text, p.spoken) / p.tempo);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  const tokens = parts.map((p, i) => {
    acc += weights[i];
    return { text: p.text, spoken: p.spoken, end: acc / total };
  });
  return { tokens, totalWeight: total };
}

interface Props {
  text: string;
  /** Tempo per bagian jawaban; tanpa ini seluruh teks dianggap bertempo sama. */
  runs?: SpeechRun[];
  emotion: VoiceEmotion;
  /** Posisi audio 0–1, atau null bila durasi belum diketahui. */
  getProgress: () => number | null;
}

/** Subtitle karaoke: kata yang sedang diucapkan Miu-chan menyala, mengikuti posisi audio setiap frame. */
export function SpeechSubtitle({ text, runs, emotion, getProgress }: Props) {
  const { tokens, totalWeight } = useMemo(() => tokenize(text, runs), [text, runs]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const startedAt = performance.now();
    const estimatedMs = totalWeight * MS_PER_WEIGHT;
    let current = -1;
    let raf = 0;
    const tick = () => {
      const progress = getProgress() ?? Math.min((performance.now() - startedAt) / estimatedMs, 1);
      let index = tokens.findIndex((t) => progress < t.end);
      if (index === -1) index = tokens.length - 1;
      // Sorot tetap di kata terakhir yang diucapkan selama jeda tanda baca
      while (index > 0 && !tokens[index].spoken) index--;
      if (index !== current) {
        current = index;
        setActive(index);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tokens, totalWeight, getProgress]);

  // Jawaban panjang: gulir supaya baris yang sedang diucapkan tetap terlihat
  useEffect(() => {
    const box = boxRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    if (box && el) box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 3);
  }, [active]);

  return (
    <p ref={boxRef} className={`${styles.subtitle} ${styles[emotion] ?? ""}`} aria-live="polite">
      {tokens.map((t, i) => (
        <span
          key={i}
          data-i={i}
          className={
            i === active && t.spoken ? styles.active : i < active ? styles.past : styles.upcoming
          }
        >
          {t.text}
        </span>
      ))}
    </p>
  );
}
