"use client";

import { useState } from "react";
import { srsApi } from "@/features/srs/data/srsApi";
import type { DueCard, ReviewGrade } from "@/features/srs/domain/types";
import { useSpeech } from "@/shared/lib/useSpeech";
import styles from "./warmup.module.css";

const GRADES: { value: ReviewGrade; label: string; hint: string }[] = [
  { value: "lupa", label: "Lupa", hint: "Ulang segera" },
  { value: "sulit", label: "Sulit", hint: "Ingat dengan susah" },
  { value: "bisa", label: "Bisa", hint: "Ingat" },
  { value: "mudah", label: "Mudah", hint: "Langsung ingat" },
];

/** Langkah 1: ulang kartu SRS yang jatuh tempo sebelum materi baru. */
export function WarmupDeck({ cards, chapterTitle, onDone }: { cards: DueCard[]; chapterTitle: string; onDone: () => void }) {
  const { speak } = useSpeech();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const card = cards[index];

  function reveal() {
    setFlipped(true);
    speak(card.front);
  }

  async function grade(g: ReviewGrade) {
    setBusy(true);
    // Gagal menyimpan nilai tidak menghentikan pemanasan; kartu akan muncul lagi di Review
    await srsApi.review(card.id, g).catch(() => {});
    setBusy(false);
    if (index + 1 >= cards.length) {
      onDone();
      return;
    }
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>Pemanasan · Ulang bab sebelumnya · {index + 1}/{cards.length}</p>
        <button type="button" className={styles.skip} onClick={onDone}>
          Lewati
        </button>
      </div>
      <p className={styles.lead}>
        Kartu ini dari bab yang <strong>sudah kamu selesaikan</strong>, bukan materi baru. Tebak artinya, lalu balik kartunya. Materi{" "}
        <strong>{chapterTitle}</strong> dimulai setelah pemanasan.
      </p>

      <div className={styles.scene} key={card.id}>
        <button
          type="button"
          className={styles.card}
          data-flipped={flipped || undefined}
          onClick={() => (flipped ? speak(card.front) : reveal())}
          aria-label={flipped ? `Putar suara ${card.front}` : `Balik kartu ${card.front}`}
        >
          <span className={`${styles.face} ${styles.front}`} aria-hidden={flipped}>
            <span className={styles.kind}>Ulangan · {card.itemType === "kanji" ? "Kanji" : "Kosakata"}</span>
            <span className={styles.word} lang="ja">{card.front}</span>
            <span className={styles.tap}>Ketuk untuk membalik</span>
          </span>
          <span className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
            <span className={styles.word} lang="ja">{card.front}</span>
            {card.reading && <span className={styles.reading} lang="ja">{card.reading}</span>}
            <span className={styles.meaning}>{card.meaning}</span>
            <span className={styles.tap}>🔊 Ketuk untuk dengar lagi</span>
          </span>
        </button>
      </div>

      {flipped ? (
        <div className={styles.grades} role="group" aria-label="Seberapa ingat kamu?">
          {GRADES.map((g) => (
            <button key={g.value} type="button" className={styles.grade} data-grade={g.value} onClick={() => grade(g.value)} disabled={busy}>
              <strong>{g.label}</strong>
              <small>{g.hint}</small>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className={styles.revealBtn} onClick={reveal}>
          Tunjukkan jawaban
        </button>
      )}
    </div>
  );
}
