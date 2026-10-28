"use client";

import { useState, type ReactNode } from "react";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import type { QuizInput, QuizItem } from "@/features/admin/data/contentApi";
import { EXERCISES, EXERCISE_ORDER, SKILLS, SKILL_ORDER, type ExerciseType } from "@/shared/lib/exercises";
import { hasKana, toRomaji } from "@/shared/lib/kana";
import { Field } from "./FormModal";
import styles from "./content.module.css";

/** Isian form; diterjemahkan ke bentuk API (options/correctAnswer) oleh toInput. */
interface Draft {
  type: ExerciseType;
  question: string;
  /** Pertanyaan diubah manual — romaji otomatis tidak lagi menimpanya. */
  questionTouched: boolean;
  hint: string;
  explanation: string;
  audio: string;
  choices: string[];
  correctChoice: string;
  /** Susun: kepingan jawaban; menulis/berbicara: jawaban. */
  answer: string;
  /** Susun: kepingan pengecoh; berbicara: variasi jawaban yang juga diterima. */
  extras: string;
}

const TTS_PREFIX = "/api/tts?text=";
const SPEAK_DEFAULT = "Ucapkan kalimat berikut dengan jelas.";

const splitList = (text: string) =>
  text
    .split("/")
    .map((t) => t.trim())
    .filter(Boolean);

/** Kepingan susun huruf boleh ditulis tanpa "/" — tiap huruf jadi satu kepingan. */
function pieces(type: ExerciseType, text: string): string[] {
  if (type === "susun_huruf" && !text.includes("/")) return [...text.replace(/\s+/g, "")];
  if (type === "susun_kalimat" && !text.includes("/")) return text.split(/\s+/).filter(Boolean);
  return splitList(text);
}

function fromItem(item?: Omit<QuizItem, "id">): Draft {
  const empty: Draft = {
    type: "pilihan_ganda",
    question: "",
    questionTouched: false,
    hint: "",
    explanation: "",
    audio: "",
    choices: ["", "", "", ""],
    correctChoice: "",
    answer: "",
    extras: "",
  };
  if (!item) return empty;
  const options = item.options ?? [];
  const audio = item.audioUrl?.startsWith(TTS_PREFIX) ? decodeURIComponent(item.audioUrl.slice(TTS_PREFIX.length)) : item.audioUrl ?? "";
  const base = { ...empty, type: item.type, question: item.question, questionTouched: true, hint: item.hint ?? "", explanation: item.explanation ?? "", audio };
  if (item.type === "pilihan_ganda" || item.type === "mendengar") return { ...base, choices: options, correctChoice: item.correctAnswer };
  if (item.type === "susun_huruf" || item.type === "susun_kalimat") {
    // Kepingan jawaban disimpan lebih dulu, diikuti pengecoh.
    let k = 0;
    while (k < options.length && options.slice(0, k).join("") !== item.correctAnswer) k++;
    const parts = options.slice(0, k).join("") === item.correctAnswer ? options.slice(0, k) : [...item.correctAnswer];
    return { ...base, answer: parts.join(" / "), extras: options.slice(parts.length).join(" / ") };
  }
  return { ...base, answer: item.correctAnswer, extras: options.join(" / ") };
}

function toInput(d: Draft): QuizInput {
  const audioUrl = !d.audio.trim() ? null : /^(https?:\/\/|\/)/.test(d.audio.trim()) ? d.audio.trim() : TTS_PREFIX + encodeURIComponent(d.audio.trim());
  const common = { type: d.type, question: d.question.trim(), hint: d.hint.trim() || null, explanation: d.explanation.trim() || null, audioUrl };
  switch (d.type) {
    case "pilihan_ganda":
    case "mendengar":
      return { ...common, options: d.choices.map((c) => c.trim()).filter(Boolean), correctAnswer: d.correctChoice.trim() };
    case "susun_huruf":
    case "susun_kalimat": {
      const parts = pieces(d.type, d.answer);
      return { ...common, options: [...parts, ...pieces(d.type, d.extras)], correctAnswer: parts.join("") };
    }
    case "menulis":
      return { ...common, audioUrl: null, options: [], correctAnswer: d.answer.replace(/\s+/g, "") };
    case "berbicara":
      return { ...common, question: common.question || SPEAK_DEFAULT, options: splitList(d.extras), correctAnswer: d.answer.trim() };
  }
}

/** Romaji otomatis dari jawaban, untuk soal yang memperlihatkan romaji ke siswa. */
function autoQuestion(type: ExerciseType, answer: string): string | null {
  if (type !== "menulis" && type !== "susun_huruf") return null;
  const word = answer.replace(/[\s/]+/g, "");
  return hasKana(word) ? toRomaji(word) : "";
}

/** Form latihan bab; dipakai juga bank soal ujian dengan isian tambahan lewat `children`. */
export function ExerciseForm({
  item,
  onSubmit,
  onClose,
  noun = "latihan",
  children,
}: {
  item?: Omit<QuizItem, "id">;
  onSubmit: (data: QuizInput) => Promise<void>;
  onClose: () => void;
  noun?: string;
  children?: ReactNode;
}) {
  const [d, setD] = useState<Draft>(() => fromItem(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = EXERCISES[d.type];
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  function setAnswer(answer: string) {
    const auto = autoQuestion(d.type, answer);
    set(auto !== null && !d.questionTouched ? { answer, question: auto } : { answer });
  }

  function setType(type: ExerciseType) {
    // Jawaban pilihan ganda ikut dibawa saat pindah ke jenis yang memakai isian jawaban.
    const answer = d.answer || (type === "pilihan_ganda" || type === "mendengar" ? "" : d.correctChoice);
    const auto = autoQuestion(type, answer);
    set(auto !== null && !d.questionTouched ? { type, answer, question: auto } : { type, answer });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(toInput(d));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      setSaving(false);
    }
  }

  const input = toInput(d);
  const isChoice = d.type === "pilihan_ganda" || d.type === "mendengar";
  const isTiles = d.type === "susun_huruf" || d.type === "susun_kalimat";
  const questionLabel: Record<ExerciseType, string> = {
    pilihan_ganda: "Pertanyaan",
    mendengar: "Pertanyaan",
    susun_huruf: "Perintah / romaji yang ditampilkan",
    susun_kalimat: "Kalimat yang harus disusun (terjemahan)",
    menulis: "Romaji yang ditampilkan",
    berbicara: "Perintah (opsional)",
  };

  return (
    <div className={adminStyles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`${adminStyles.modalContent} ${styles.modalWide}`} onSubmit={submit} role="dialog" aria-modal="true" aria-label={`${item ? "Ubah" : "Tambah"} ${noun}`}>
        <h2 className={adminStyles.modalTitle}>{item ? "Ubah" : "Tambah"} {noun}</h2>

        {children && <div className={styles.formGrid}>{children}</div>}

        <fieldset className={styles.typePicker}>
          <legend className={adminStyles.fieldLabel}>Jenis {noun}</legend>
          {SKILL_ORDER.map((skill) => {
            const types = EXERCISE_ORDER.filter((t) => EXERCISES[t].skill === skill);
            return (
              <div key={skill} className={styles.typeGroup}>
                <span className={styles.typeGroupLabel}>
                  {SKILLS[skill].icon} {SKILLS[skill].label}
                </span>
                <div className={styles.typeOptions}>
                  {types.map((t) => (
                    <label key={t} className={styles.typeOption} data-active={d.type === t}>
                      <input type="radio" name="exercise-type" value={t} checked={d.type === t} onChange={() => setType(t)} />
                      {EXERCISES[t].label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <span className={styles.hint}>{meta.description}</span>
        </fieldset>

        <div className={styles.formGrid}>
          {d.type === "mendengar" && (
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label htmlFor="ex-audio" className={adminStyles.fieldLabel}>Audio</label>
              <input id="ex-audio" className={styles.input} lang="ja" value={d.audio} onChange={(e) => set({ audio: e.target.value })} required />
              <span className={styles.hint}>Tulis teks Jepang untuk dibacakan suara otomatis, atau tempel URL file audio.</span>
            </div>
          )}

          {isTiles && (
            <>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="ex-answer" className={adminStyles.fieldLabel}>
                  {d.type === "susun_huruf" ? "Kata jawaban" : "Kalimat jawaban, dipotong per kepingan"}
                </label>
                <input id="ex-answer" className={styles.input} lang="ja" value={d.answer} onChange={(e) => setAnswer(e.target.value)} required />
                <span className={styles.hint}>
                  {d.type === "susun_huruf"
                    ? "Contoh: ねこ (tiap huruf jadi satu kepingan). Pakai / untuk kepingan lebih dari satu huruf: きょ / う"
                    : "Pisahkan kepingan dengan / atau spasi. Contoh: わたし / は / がくせい / です"}
                </span>
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="ex-extras" className={adminStyles.fieldLabel}>Kepingan pengecoh (opsional)</label>
                <input id="ex-extras" className={styles.input} lang="ja" value={d.extras} onChange={(e) => set({ extras: e.target.value })} />
                <span className={styles.hint}>Kepingan salah yang ikut diacak. Contoh: {d.type === "susun_huruf" ? "か め" : "が / を"}</span>
              </div>
            </>
          )}

          {d.type === "menulis" && (
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label htmlFor="ex-answer" className={adminStyles.fieldLabel}>Jawaban (ditulis tangan oleh siswa)</label>
              <input id="ex-answer" className={styles.input} lang="ja" value={d.answer} onChange={(e) => setAnswer(e.target.value)} required maxLength={12} />
              <span className={styles.hint}>Hiragana atau katakana, maksimal 12 huruf. Kanji hanya bisa dipakai bila ada di daftar kanji bab ini.</span>
            </div>
          )}

          {d.type === "berbicara" && (
            <>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="ex-answer" className={adminStyles.fieldLabel}>Kalimat yang diucapkan</label>
                <input id="ex-answer" className={styles.input} lang="ja" value={d.answer} onChange={(e) => set({ answer: e.target.value })} required />
                {hasKana(d.answer) && <span className={styles.hint}>Romaji untuk siswa: {toRomaji(d.answer)}</span>}
              </div>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor="ex-extras" className={adminStyles.fieldLabel}>Tulisan lain yang juga diterima (opsional)</label>
                <input id="ex-extras" className={styles.input} lang="ja" value={d.extras} onChange={(e) => set({ extras: e.target.value })} />
                <span className={styles.hint}>
                  Pengenal suara sering menulis dengan kanji. Contoh: 私は学生です. Pisahkan dengan /. Ucapan dianggap benar bila ≥80% mirip.
                </span>
              </div>
            </>
          )}

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label htmlFor="ex-question" className={adminStyles.fieldLabel}>{questionLabel[d.type]}</label>
            <input
              id="ex-question"
              className={styles.input}
              value={d.question}
              onChange={(e) => set({ question: e.target.value, questionTouched: true })}
              required={d.type !== "berbicara"}
              placeholder={d.type === "berbicara" ? SPEAK_DEFAULT : undefined}
            />
            {(d.type === "menulis" || d.type === "susun_huruf") && (
              <span className={styles.hint}>
                Terisi otomatis dari jawaban.{" "}
                {d.questionTouched && (
                  <button type="button" className={styles.inlineLink} onClick={() => set({ question: autoQuestion(d.type, d.answer) ?? "", questionTouched: false })}>
                    Isi ulang romaji
                  </button>
                )}
              </span>
            )}
          </div>

          {isChoice && (
            <Field
              def={{ name: "choices", label: "Pilihan jawaban", type: "choices", answerName: "correctChoice" }}
              values={{ choices: d.choices, correctChoice: d.correctChoice }}
              set={(name, value) => set({ [name]: value } as Partial<Draft>)}
            />
          )}

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label htmlFor="ex-hint" className={adminStyles.fieldLabel}>Arti / petunjuk (opsional)</label>
            <input id="ex-hint" className={styles.input} value={d.hint} onChange={(e) => set({ hint: e.target.value })} maxLength={255} />
            <span className={styles.hint}>Tampil saat siswa mengerjakan, mis. arti kata &quot;kucing&quot;.</span>
          </div>

          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label htmlFor="ex-exp" className={adminStyles.fieldLabel}>Pembahasan (opsional)</label>
            <textarea id="ex-exp" className={styles.textarea} value={d.explanation} onChange={(e) => set({ explanation: e.target.value })} />
            <span className={styles.hint}>Ditampilkan ke siswa setelah latihan dinilai.</span>
          </div>
        </div>

        {(isTiles || d.type === "menulis") && input.correctAnswer && (
          <div className={styles.preview}>
            <span className={adminStyles.fieldLabel}>Pratinjau untuk siswa</span>
            {d.question && <p className={styles.previewPrompt}>{d.question}</p>}
            <div className={styles.previewTiles} lang="ja">
              {d.type === "menulis"
                ? [...input.correctAnswer].map((_, i) => <span key={i} className={styles.previewSlot} />)
                : input.options.map((t, i) => <span key={i} className={styles.previewTile}>{t}</span>)}
            </div>
            {isTiles && <span className={styles.hint}>Urutan kepingan diacak saat ditampilkan ke siswa.</span>}
          </div>
        )}

        {error && <div className={`${styles.message} ${styles.messageError}`}>{error}</div>}
        <div className={adminStyles.modalButtons}>
          <button type="button" className={`${styles.btn} ${adminStyles.btnSecondary}`} onClick={onClose}>
            Batal
          </button>
          <button type="submit" className={`${styles.btn} ${adminStyles.btnPrimary}`} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
