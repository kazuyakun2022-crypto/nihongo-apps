"use client";

import { useState } from "react";
import styles from "./exercises.module.css";

/** Pulihkan urutan kepingan dari jawaban tersimpan (saat siswa kembali ke soal ini). */
function picksFromAnswer(answer: string, tiles: string[]): number[] {
  const picks: number[] = [];
  const walk = (rest: string): boolean => {
    if (rest === "") return true;
    for (let i = 0; i < tiles.length; i++) {
      if (picks.includes(i) || !tiles[i] || !rest.startsWith(tiles[i])) continue;
      picks.push(i);
      if (walk(rest.slice(tiles[i].length))) return true;
      picks.pop();
    }
    return false;
  };
  return answer && walk(answer) ? picks : [];
}

/** Susun huruf/kalimat: ketuk kepingan untuk memasukkannya ke baris jawaban, ketuk lagi untuk mengembalikan. */
export function TileExercise({
  tiles,
  answer,
  onAnswer,
  sentence,
  disabled,
}: {
  tiles: string[];
  answer: string | null;
  onAnswer: (answer: string) => void;
  sentence: boolean;
  disabled?: boolean;
}) {
  const [picks, setPicks] = useState<number[]>(() => picksFromAnswer(answer ?? "", tiles));

  function update(next: number[]) {
    setPicks(next);
    onAnswer(next.map((i) => tiles[i]).join(""));
  }

  return (
    <div className={styles.tileWrap}>
      <div className={`${styles.answerLine} ${sentence ? styles.answerLineSentence : ""}`} aria-label="Susunan jawaban" aria-live="polite">
        {picks.length === 0 && <span className={styles.answerPlaceholder}>Ketuk kepingan di bawah</span>}
        {picks.map((i, pos) => (
          <button key={`${i}-${pos}`} type="button" className={`${styles.tile} ${styles.tilePlaced}`} lang="ja" disabled={disabled} onClick={() => update(picks.filter((p) => p !== i))}>
            {tiles[i]}
          </button>
        ))}
      </div>
      <div className={styles.tileBank}>
        {tiles.map((t, i) => {
          const used = picks.includes(i);
          return (
            <button
              key={i}
              type="button"
              className={styles.tile}
              data-used={used}
              lang="ja"
              disabled={disabled || used}
              aria-label={used ? `${t} (sudah dipakai)` : t}
              onClick={() => update([...picks, i])}
            >
              {t}
            </button>
          );
        })}
      </div>
      {picks.length > 0 && (
        <button type="button" className={styles.linkBtn} onClick={() => update([])} disabled={disabled}>
          Ulangi susunan
        </button>
      )}
    </div>
  );
}
