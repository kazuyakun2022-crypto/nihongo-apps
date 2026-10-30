"use client";

import { FuriganaText, stripFurigana } from "@/features/conversation/ui/FuriganaText";
import { HIRAGANA_STROKE_DATA } from "@/features/huruf/data/hiraganaStrokes";
import { useSpeech } from "@/shared/lib/useSpeech";
import type { LessonBlock } from "../domain/types";
import styles from "./chapter.module.css";

const BADGE: Record<string, { label: string; className: string }> = {
  teks: { label: "Materi", className: styles.badgeLesson },
  gambar: { label: "Materi", className: styles.badgeLesson },
  dialog: { label: "Dialog", className: styles.badgeDialog },
  tips: { label: "Tips", className: styles.badgeTips },
  huruf: { label: "Huruf", className: styles.badgeKana },
};

/** Blok huruf ditulis admin satu huruf per baris: "あ | a | mnemonik". */
function parseKana(body: string) {
  return body
    .split("\n")
    .map((line) => line.split("|").map((p) => p.trim()))
    .filter(([char]) => !!char)
    .map(([char, romaji, mnemonic]) => ({ char, romaji: romaji ?? "", mnemonic: mnemonic ?? "", strokes: HIRAGANA_STROKE_DATA[char]?.strokeCount ?? null }));
}

interface DialogLine {
  speaker: string | null;
  text: string;
  translation: string | null;
}

/**
 * Dialog ditulis admin satu ucapan per baris ("A: …"); baris berawalan ">" adalah terjemahan ucapan sebelumnya.
 * Baris tanpa nama pembicara tetap ditampilkan sebagai ucapan.
 */
function parseDialog(body: string): DialogLine[] {
  const lines: DialogLine[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(">") && lines.length > 0) {
      lines[lines.length - 1].translation = line.slice(1).trim();
      continue;
    }
    const m = line.match(/^([^:：]{1,20})[:：]\s*(.+)$/);
    lines.push(m ? { speaker: m[1].trim(), text: m[2].trim(), translation: null } : { speaker: null, text: line, translation: null });
  }
  return lines;
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={styles.blockText} lang="ja">
            <FuriganaText text={p} />
          </p>
        ))}
    </>
  );
}

/** Satu kartu materi bebas di awal bab. */
export function LessonBlockView({ block }: { block: LessonBlock }) {
  const { speak } = useSpeech();
  const badge = BADGE[block.type] ?? BADGE.teks;
  const speakers = block.type === "dialog" && block.body ? [...new Set(parseDialog(block.body).map((l) => l.speaker).filter(Boolean))] : [];

  return (
    <>
      <span className={`${styles.cardBadge} ${badge.className}`}>{badge.label}</span>
      {block.title && (
        <h2 className={styles.blockTitle}>
          <FuriganaText text={block.title} />
        </h2>
      )}

      {block.imageUrl && (
        <figure className={styles.blockFigure}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.imageUrl} alt={block.caption ?? block.title ?? "Gambar materi"} className={styles.blockImage} loading="lazy" decoding="async" />
          {block.caption && <figcaption className={styles.blockCaption}>{block.caption}</figcaption>}
        </figure>
      )}

      {block.body && block.type === "huruf" ? (
        <div className={styles.kanaGrid}>
          {parseKana(block.body).map((k) => (
            <button key={k.char} type="button" className={styles.kanaCard} onClick={() => speak(k.char)} aria-label={`Dengarkan ${k.char}, dibaca ${k.romaji}`}>
              <span className={styles.kanaChar} lang="ja">
                {k.char}
              </span>
              <span className={styles.kanaRomaji}>
                {k.romaji}
                {k.strokes && <span className={styles.kanaStrokes}> · {k.strokes} goresan</span>}
              </span>
              {k.mnemonic && <span className={styles.kanaMnemonic}>{k.mnemonic}</span>}
            </button>
          ))}
          <p className={styles.blockHint}>Ketuk kartu untuk mendengar bunyinya.</p>
        </div>
      ) : block.body && block.type === "dialog" ? (
        <div className={styles.dialog}>
          {parseDialog(block.body).map((line, i) => (
            <div key={i} className={styles.dialogLine} data-side={line.speaker && speakers.indexOf(line.speaker) % 2 === 1 ? "right" : "left"}>
              {line.speaker && <span className={styles.dialogSpeaker}>{line.speaker}</span>}
              <button type="button" className={styles.dialogBubble} onClick={() => speak(stripFurigana(line.text))} aria-label={`Putar: ${stripFurigana(line.text)}`}>
                <FuriganaText text={line.text} />
                {line.translation && <span className={styles.dialogTranslation}>{line.translation}</span>}
              </button>
            </div>
          ))}
          <p className={styles.blockHint}>Ketuk gelembung untuk mendengarkan.</p>
        </div>
      ) : block.body && block.type === "tips" ? (
        <div className={styles.tipsBox}>
          <Paragraphs text={block.body} />
        </div>
      ) : (
        block.body && <Paragraphs text={block.body} />
      )}
    </>
  );
}
