"use client";

import { QuestionAudio } from "./exercises/QuestionAudio";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FuriganaText, stripFurigana } from "@/features/conversation/ui/FuriganaText";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot, type MascotMood } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";
import { useSpeech } from "@/shared/lib/useSpeech";
import { EXERCISES, SKILLS, countBySkill, type SkillId } from "@/shared/lib/exercises";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { useAssessment, useScreenContext } from "@/features/navigator/application/NavigatorProvider";
import { isPracticeQuestion, useChapterLesson, type StudyCard } from "../application/useChapterLesson";
import type { ChapterQuizQuestion } from "../domain/types";
import { LessonBlockView, parseKana } from "./LessonBlockView";
import { HandwritingExercise } from "./exercises/HandwritingExercise";
import { SpeakingExercise } from "./exercises/SpeakingExercise";
import { TileExercise } from "./exercises/TileExercise";
import { ScoreScreen, useCountUp } from "./ScoreScreen";
import { WarmupDeck } from "./WarmupDeck";
import { JUST_COMPLETED_KEY } from "./WorldMap";
import { soundFX } from "@/lib/audio/SoundFXManager";
import styles from "./chapter.module.css";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  CloseIcon,
  GraduationCapIcon,
  MessageIcon,
  MicIcon,
  MinusIcon,
  RotateCwIcon,
  SparklesIcon,
  VolumeIcon,
} from "@/shared/ui/icons";
import { SkillIcon } from "@/shared/ui/SkillIcon";

const LABELS = ["A", "B", "C", "D", "E", "F"];


const BLOCK_LABEL: Record<string, string> = { teks: "Materi", gambar: "Gambar", dialog: "Dialog", tips: "Tips", huruf: "Huruf" };

/** Label singkat tiap kartu materi untuk daftar langkah di desktop. */
function stepInfo(card: StudyCard): { kind: string; text: string } {
  switch (card.kind) {
    case "block":
      return { kind: BLOCK_LABEL[card.data.type] ?? "Materi", text: stripFurigana(card.data.title ?? card.data.caption ?? BLOCK_LABEL[card.data.type] ?? "Materi") };
    case "vocab":
      return { kind: "Kosakata", text: card.data.word };
    case "kanji":
      return { kind: "Kanji", text: card.data.character };
    case "grammar":
      return { kind: "Tata bahasa", text: stripFurigana(card.data.pattern) };
  }
}

const cut = (s: string | null | undefined, n: number) => {
  const t = stripFurigana(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const PHASE_LABEL: Record<string, string> = {
  warmup: "pemanasan (mengulang kosakata bab sebelumnya)",
  study: "materi",
  "quiz-intro": "persiapan kuis",
  result: "hasil kuis",
};

/** Ringkasan isi layar pelajaran untuk Miu-chan: materi lengkap saat belajar, soal & pilihan saat latihan/kuis. */
function lessonContext(
  chapterTitle: string,
  phase: string,
  card: StudyCard | null,
  question: ChapterQuizQuestion | null,
  index: number,
  total: number,
): string {
  const head = `Bab "${cut(chapterTitle, 60)}"`;
  if (question) {
    const kind = isPracticeQuestion(question) ? "latihan" : "kuis";
    const parts = [`${head}, ${kind} soal ${index + 1} dari ${total} (jenis ${question.type})`, `soal: ${cut(question.question, 160)}`];
    if (question.hint) parts.push(`petunjuk di layar: ${cut(question.hint, 80)}`);
    if (question.speakText) parts.push(`kalimat yang harus diucapkan: ${cut(question.speakText, 80)}`);
    if (question.options.length) parts.push(`pilihan/kepingan: ${question.options.map((o) => cut(o, 30)).join(" | ")}`);
    return parts.join("; ");
  }
  if (phase === "study" && card) {
    switch (card.kind) {
      case "vocab":
        return `${head}, materi kosakata: ${card.data.word} (${card.data.reading}) = ${cut(card.data.meaningId, 60)}${card.data.exampleSentence ? `; contoh: ${cut(card.data.exampleSentence, 80)} = ${cut(card.data.exampleTranslation, 80)}` : ""}`;
      case "kanji":
        return `${head}, materi kanji: ${card.data.character}, onyomi ${card.data.onyomi ?? "-"}, kunyomi ${card.data.kunyomi ?? "-"}, arti ${cut(card.data.meaningId, 60)}`;
      case "grammar":
        return `${head}, materi tata bahasa: pola ${cut(card.data.pattern, 60)}; penjelasan: ${cut(card.data.explanation, 220)}${card.data.exampleSentence ? `; contoh: ${cut(card.data.exampleSentence, 80)}` : ""}`;
      case "block": {
        const title = card.data.title ? ` "${cut(card.data.title, 60)}"` : "";
        // Blok huruf disimpan sebagai baris "あ|a|…": kirim sebagai daftar huruf + bacaan supaya tidak salah tafsir
        if (card.data.type === "huruf" && card.data.body) {
          const kana = parseKana(card.data.body).map((k) => `${k.char} (${k.romaji})`).join(", ");
          return `${head}, materi huruf${title}. Huruf yang sedang tampil HANYA: ${kana}`;
        }
        return `${head}, materi ${BLOCK_LABEL[card.data.type] ?? "teks"}${title}: ${cut(card.data.body ?? card.data.caption, 300)}`;
      }
    }
  }
  return `${head}, tahap ${PHASE_LABEL[phase] ?? phase}`;
}

/** Saran Miu-chan di panel samping, sesuai jenis kartu yang sedang dibuka. */
function studyTip(card: StudyCard): string {
  switch (card.kind) {
    case "vocab":
      return "Ketuk ikon suara, lalu ucapkan katanya keras-keras. Mengucapkan membantu kata lebih cepat diingat.";
    case "kanji":
      return "Coba tulis kanji ini di udara atau di kertas sambil menyebut cara bacanya.";
    case "grammar":
      return "Buat satu kalimat sendiri dengan pola ini sebelum lanjut. Contoh buatanmu lebih mudah diingat.";
    default:
      return card.data.type === "dialog"
        ? "Ketuk tiap baris dialog untuk mendengar pengucapannya."
        : "Baca pelan-pelan. Kamu bisa kembali ke langkah mana pun lewat daftar ini.";
  }
}

/** Saran Miu-chan saat kuis, sesuai keterampilan yang sedang dilatih. */
const QUIZ_TIP: Record<SkillId, string> = {
  pemahaman: "Baca seluruh pilihan dulu. Pilihan yang mirip biasanya berbeda di partikel atau nuansanya.",
  mendengar: "Putar audionya sesering yang kamu perlu. Fokus pada kata kunci, bukan setiap kata.",
  menyusun: "Cari dulu predikat di akhir kalimat, lalu susun keterangan dan subjek di depannya.",
  menulis: "Perhatikan urutan goresan. Tulisan yang rapi lebih mudah dikenali.",
  berbicara: "Ucapkan dengan tempo biasa dan jelas. Kalau mikrofon tidak bisa dipakai, soal ini boleh dilewati.",
};

/** Siklus 5 langkah tiap bab. Langkah tanpa isi (tak ada kartu jatuh tempo / soal praktik) terlewati otomatis. */
type Stage = "warmup" | "study" | "practice" | "quiz" | "result";
const STAGES: { key: Stage; label: string }[] = [
  { key: "warmup", label: "Pemanasan" },
  { key: "study", label: "Materi" },
  { key: "practice", label: "Praktik" },
  { key: "quiz", label: "Kuis" },
  { key: "result", label: "Hasil" },
];

/**
 * Kerangka pelajaran. Di layar lebar ada panel samping (judul bab, tahapan, daftar langkah, saran Miu-chan);
 * di ponsel panel disembunyikan dan isi tampil satu kolom seperti biasa.
 */
function LessonShell({
  title,
  moduleTitle,
  stage,
  steps,
  tip,
  mood = "senang",
  children,
}: {
  title: string;
  moduleTitle?: string | null;
  stage: Stage;
  steps?: ReactNode;
  tip?: string;
  mood?: MascotMood;
  children: ReactNode;
}) {
  const stageIndex = STAGES.findIndex((s) => s.key === stage);
  return (
    <div className={styles.shell}>
      <aside className={styles.rail} aria-label="Navigasi pelajaran">
        <Link href="/belajar" className={styles.railBack}>← Daftar bab</Link>
        <div className={styles.railHead}>
          {moduleTitle && <p className={styles.railModule}>{moduleTitle}</p>}
          <h1 className={styles.railTitle}>{title}</h1>
        </div>
        <ol className={styles.stageList}>
          {STAGES.map((s, i) => (
            <li key={s.key} className={styles.stageItem} data-state={i < stageIndex ? "done" : i === stageIndex ? "current" : "todo"}>
              <span className={styles.stageNum} aria-hidden>{i < stageIndex ? <CheckIcon size={12} strokeWidth={3} /> : i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>
        {steps}
        {tip && (
          <div className={styles.railTip}>
            <Mascot mood={mood} size={48} />
            <p key={tip} className={styles.railTipText}>{tip}</p>
          </div>
        )}
      </aside>
      <div className={styles.stage}>
        {/* Di bawah 1280px panel samping (dan judulnya) tersembunyi: judul bab ringkas di atas pelajaran */}
        <h1 className={styles.stageTitle}>
          {moduleTitle && <span className={styles.stageModule}>{moduleTitle}</span>}
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

/** Abaikan pintasan keyboard saat pengguna sedang mengetik atau menggambar. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "CANVAS"].includes(target.tagName);
}

export function ChapterLesson({ chapterId }: { chapterId: string }) {
  const lesson = useChapterLesson(chapterId);
  // Latihan & kuis bab: Miu-chan tetap boleh menjelaskan dan memberi petunjuk, tapi tidak memberi jawaban
  const inQuiz = (lesson.phase === "quiz" || lesson.phase === "submitting") && !!lesson.currentQuestion;
  useAssessment("bab", inQuiz ? (isPracticeQuestion(lesson.currentQuestion!) ? "latihan" : "kuis") : null, inQuiz ? lesson.currentQuestion!.id : undefined);
  // Konteks untuk Miu-chan: isi yang sedang tampil (materi atau soal, tanpa kunci jawaban yang memang tidak ada di klien)
  useScreenContext("bab", lesson.chapter ? lessonContext(lesson.chapter.title, lesson.phase, lesson.currentStudyCard, inQuiz ? lesson.currentQuestion : null, lesson.quizIndex, lesson.quizQuestions.length) : null);
  const { speak } = useSpeech();
  const chapterKanji = useMemo(() => lesson.chapter?.kanji.map((k) => k.character) ?? [], [lesson.chapter]);

  // Pintasan ← → untuk pindah kartu/soal (berguna di desktop)
  const { phase, studyIndex, quizIndex, currentAnswer, currentSkipped, isLastQuiz } = lesson;

  // Kartu/soal/tahap baru selalu dibuka dari atas (audio soal berhenti sendiri lewat QuestionAudio)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase, studyIndex, quizIndex]);
  useEffect(() => {
    if (phase !== "study" && phase !== "quiz") return;
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      if (e.key === "ArrowRight") {
        if (phase === "study") lesson.nextStudy();
        else if (!isLastQuiz && (currentAnswer || currentSkipped)) lesson.nextQuiz();
      } else if (e.key === "ArrowLeft") {
        if (phase === "study") lesson.prevStudy();
        else lesson.prevQuiz();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // lesson.* berubah tiap render; cukup daftar ulang saat posisi/jawaban berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, studyIndex, quizIndex, currentAnswer, currentSkipped, isLastQuiz]);

  // ── Loading ──
  if (lesson.phase === "loading") {
    return (
      <SkeletonRegion label="Memuat pelajaran…" className={styles.wrap}>
        <div className={styles.progressRow}>
          <Skeleton circle width={32} />
          <Skeleton height="0.5rem" radius="var(--radius-pill)" style={{ flex: 1 }} />
          <Skeleton width="2rem" />
        </div>
        <div className={styles.studyCard}>
          <Skeleton width="5rem" height="1.25rem" radius="var(--radius-pill)" />
          <Skeleton width="60%" height="2.5rem" />
          <Skeleton width="40%" />
          <SkeletonText lines={2} />
        </div>
        <Skeleton height="3rem" radius="var(--radius-pill)" />
      </SkeletonRegion>
    );
  }

  // ── Error ──
  if (lesson.phase === "error") {
    return (
      <div className={styles.wrap}>
        <Alert>{lesson.errorMsg}</Alert>
        <Link href="/belajar">← Kembali ke daftar bab</Link>
      </div>
    );
  }

  const chapterTitle = lesson.chapter?.title ?? "Pelajaran";
  const moduleTitle = lesson.chapter?.moduleTitle;

  // ── Pemanasan SRS ──
  if (lesson.phase === "warmup") {
    return (
      <LessonShell
        title={chapterTitle}
        moduleTitle={moduleTitle}
        stage="warmup"
        tip="Jujur saja saat menilai. Kartu yang kamu tandai Lupa akan muncul lagi lebih cepat."
        mood="berpikir"
      >
        <div className={styles.progressRow}>
          <Link href="/belajar" className={styles.closeBtn} aria-label="Tutup pelajaran"><CloseIcon size={20} /></Link>
        </div>
        <WarmupDeck cards={lesson.warmupCards} chapterTitle={chapterTitle} onDone={lesson.finishWarmup} />
      </LessonShell>
    );
  }

  // ── Study cards ──
  if (lesson.phase === "study" && lesson.currentStudyCard) {
    const card = lesson.currentStudyCard;
    const progress = ((lesson.studyIndex + 1) / lesson.studyCards.length) * 100;

    const steps = (
      <nav className={styles.stepNav} aria-label="Langkah materi">
        <p className={styles.stepNavLabel}>Materi · {lesson.studyIndex + 1}/{lesson.studyCards.length}</p>
        <ol className={styles.stepList}>
          {lesson.studyCards.map((c, i) => {
            const info = stepInfo(c);
            return (
              <li key={i}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  data-state={i === lesson.studyIndex ? "current" : i < lesson.studyIndex ? "done" : "todo"}
                  aria-current={i === lesson.studyIndex ? "step" : undefined}
                  // Langkah aktif selalu terlihat di daftar yang bisa digulir
                  ref={i === lesson.studyIndex ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                  onClick={() => lesson.goToStudy(i)}
                >
                  <span className={styles.stepKind}>{info.kind}</span>
                  <span className={styles.stepText} lang="ja">{info.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );

    return (
      <LessonShell title={chapterTitle} moduleTitle={moduleTitle} stage="study" steps={steps} tip={studyTip(card)}>
        <div className={styles.progressRow}>
          <Link href="/belajar" className={styles.closeBtn} aria-label="Tutup pelajaran"><CloseIcon size={20} /></Link>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={lesson.studyIndex + 1} aria-valuemax={lesson.studyCards.length}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{lesson.studyIndex + 1}/{lesson.studyCards.length}</span>
        </div>

        {lesson.chapter && lesson.studyIndex === 0 && lesson.chapter.explanation && (
          <div className={styles.explanationCard}>
            <p className={styles.explanationLabel}>Pengantar Bab</p>
            <p className={styles.explanationText}><FuriganaText text={lesson.chapter.explanation} /></p>
          </div>
        )}

        <div className={styles.studyCard} key={lesson.studyIndex} data-dir={lesson.direction}>
          {card.kind === "block" && <LessonBlockView block={card.data} />}

          {card.kind === "vocab" && (
            <>
              <span className={`${styles.cardBadge} ${styles.badgeVocab}`}>Kosakata</span>
              {card.data.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.data.imageUrl} alt={card.data.meaningId} className={styles.cardImage} decoding="async" />
              )}
              <p className={styles.cardMain} lang="ja">
                {card.data.word}
                <SpeakButton onClick={() => speak(card.data.word)} />
              </p>
              <p className={styles.cardReading} lang="ja">{card.data.reading}</p>
              <p className={styles.cardMeaning}>{card.data.meaningId}</p>
              {card.data.exampleSentence && (
                <button type="button" className={`${styles.exampleBtn} ${styles.cardExample}`} onClick={() => speak(stripFurigana(card.data.exampleSentence ?? ""))} aria-label="Putar contoh kalimat">
                  「<FuriganaText text={card.data.exampleSentence} />」 <VolumeIcon size={16} />
                </button>
              )}
              {card.data.exampleTranslation && <p className={styles.cardTranslation}>{card.data.exampleTranslation}</p>}
            </>
          )}

          {card.kind === "kanji" && (
            <>
              <span className={`${styles.cardBadge} ${styles.badgeKanji}`}>Kanji</span>
              <p className={`${styles.cardMain} ${styles.cardKanji}`} lang="ja">
                {card.data.character}
                <SpeakButton onClick={() => speak(card.data.character)} />
              </p>
              <div className={styles.cardReadings}>
                {card.data.onyomi && <span className={styles.readingChip}><span>On</span>{card.data.onyomi}</span>}
                {card.data.kunyomi && <span className={styles.readingChip}><span>Kun</span>{card.data.kunyomi}</span>}
              </div>
              <p className={styles.cardMeaning}>{card.data.meaningId}</p>
            </>
          )}

          {card.kind === "grammar" && (
            <>
              <span className={`${styles.cardBadge} ${styles.badgeGrammar}`}>Tata Bahasa</span>
              <p className={styles.cardPattern} lang="ja"><FuriganaText text={card.data.pattern} /></p>
              <p className={styles.cardExplanation}><FuriganaText text={card.data.explanation} /></p>
              {card.data.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.data.imageUrl} alt="" className={styles.blockImage} decoding="async" />
              )}
              {card.data.exampleSentence && (
                <button type="button" className={styles.exampleBtn} onClick={() => speak(stripFurigana(card.data.exampleSentence ?? ""))} aria-label="Putar contoh kalimat">
                  「<FuriganaText text={card.data.exampleSentence} />」 <VolumeIcon size={16} />
                </button>
              )}
              {card.data.exampleTranslation && <p className={styles.cardTranslation}>{card.data.exampleTranslation}</p>}
            </>
          )}
        </div>

        {/* Bilah Aksi Terkunci di Bawah (Zero-Scroll Docked Navigation) */}
        <div className={styles.dockedActionBar}>
          <div className={styles.dockedActionInner}>
            <button
              type="button"
              className={styles.dockedPrevBtn}
              onClick={() => {
                soundFX.play("tap", 0.35);
                lesson.prevStudy();
              }}
              disabled={lesson.studyIndex === 0}
              aria-label="Kartu sebelumnya"
            >
              ←
            </button>
            <button
              type="button"
              className={styles.dockedNextBtn}
              onClick={() => {
                soundFX.play("tap", 0.35);
                lesson.nextStudy();
              }}
            >
              {lesson.isLastStudy ? "Lanjut ke Latihan Kuis →" : "Lanjut →"}
            </button>
          </div>
        </div>
      </LessonShell>
    );
  }

  // ── Quiz intro ──
  if (lesson.phase === "quiz-intro") {
    return (
      <LessonShell
        title={chapterTitle}
        moduleTitle={moduleTitle}
        stage={lesson.quizQuestions[0] && isPracticeQuestion(lesson.quizQuestions[0]) ? "practice" : "quiz"}
        tip="Tidak perlu terburu-buru. Kamu bisa kembali ke soal sebelumnya sebelum mengumpulkan." mood="semangat">
        <div className={styles.intro}>
          <div className={styles.introMascot}>
            <Mascot mood="semangat" size={112} />
          </div>
          <div className={styles.introBody}>
            <h2 className={styles.introHeading}>Siap berlatih?</h2>
            {lesson.chapter && <p className={styles.introChapter}>{lesson.chapter.title}</p>}
            <p className={styles.muted}>{lesson.quizQuestions.length} latihan</p>
            <Alert tone="info">
              Butuh nilai minimal <strong>{lesson.chapter?.passScore ?? 70}%</strong> untuk menyelesaikan bab ini dan membuka bab
              berikutnya. Kalau belum tercapai, kamu bisa langsung mengulang kuisnya.
            </Alert>
            <ul className={styles.skillList} aria-label="Keterampilan yang dilatih">
              {countBySkill(lesson.quizQuestions.map((q) => q.type)).map(({ skill, count }) => (
                <li key={skill} className={styles.skillChip}>
                  <SkillIcon skill={skill} /> {SKILLS[skill].label} <strong>{count}</strong>
                </li>
              ))}
            </ul>
            <div className={styles.introActions}>
              <Button block onClick={lesson.startQuiz} disabled={lesson.quizQuestions.length === 0}>Mulai Latihan</Button>
              {lesson.studyCards.length > 0 && (
                <Button block variant="secondary" onClick={lesson.backToStudy}>← Ulang materi</Button>
              )}
            </div>
          </div>
        </div>
      </LessonShell>
    );
  }

  // ── Quiz ──
  if ((lesson.phase === "quiz" || lesson.phase === "submitting") && lesson.currentQuestion) {
    const q = lesson.currentQuestion;
    const progress = ((lesson.quizIndex + 1) / lesson.quizQuestions.length) * 100;
    const answeredCount = lesson.quizQuestions.filter((x) => lesson.isDone(x.id)).length;

    const steps = (
      <nav className={styles.stepNav} aria-label="Daftar soal">
        <p className={styles.stepNavLabel}>Soal · {answeredCount}/{lesson.quizQuestions.length} terjawab</p>
        <ol className={styles.qGrid}>
          {lesson.quizQuestions.map((x, i) => (
            <li key={x.id}>
              <button
                type="button"
                className={styles.qBtn}
                data-current={i === lesson.quizIndex || undefined}
                data-done={lesson.isDone(x.id) || undefined}
                aria-current={i === lesson.quizIndex ? "step" : undefined}
                aria-label={`Soal ${i + 1}${lesson.isDone(x.id) ? ", sudah dijawab" : ""}`}
                onClick={() => lesson.goToQuiz(i)}
                disabled={lesson.phase === "submitting"}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    );

    return (
      <LessonShell
        title={chapterTitle}
        moduleTitle={moduleTitle}
        stage={isPracticeQuestion(q) ? "practice" : "quiz"}
        steps={steps}
        tip={QUIZ_TIP[(EXERCISES[q.type] ?? EXERCISES.pilihan_ganda).skill]}
        mood="berpikir"
      >
        <div className={styles.progressRow}>
          <Link href="/belajar" className={styles.closeBtn} aria-label="Tutup kuis"><CloseIcon size={20} /></Link>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={lesson.quizIndex + 1} aria-valuemax={lesson.quizQuestions.length}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{lesson.quizIndex + 1}/{lesson.quizQuestions.length}</span>
        </div>

        <div className={styles.quizCard} key={q.id} data-dir={lesson.direction}>
          <QuestionHeader q={q} />
          {q.audioUrl && (
            <QuestionAudio key={q.id} url={q.audioUrl} className={styles.audioBtn} />
          )}
          {(q.type === "susun_huruf" || q.type === "susun_kalimat") && (
            <TileExercise
              tiles={q.options}
              sentence={q.type === "susun_kalimat"}
              answer={lesson.currentAnswer}
              onAnswer={(a) => lesson.selectAnswer(q.id, a)}
              disabled={lesson.phase === "submitting"}
            />
          )}
          {q.type === "menulis" && (
            <HandwritingExercise
              slots={q.slots ?? 1}
              script={q.script ?? "campuran"}
              kanji={chapterKanji}
              answer={lesson.currentAnswer}
              onAnswer={(a) => lesson.selectAnswer(q.id, a)}
            />
          )}
          {q.type === "berbicara" && (
            <SpeakingExercise
              text={q.speakText ?? ""}
              variants={q.speakVariants}
              answer={lesson.currentAnswer}
              onAnswer={(a) => lesson.selectAnswer(q.id, a)}
              onSkip={() => lesson.skipQuestion(q.id)}
              skipped={lesson.currentSkipped}
            />
          )}
          {(q.type === "pilihan_ganda" || q.type === "mendengar") && (
            <div className={styles.options}>
              {q.options.map((opt, i) => (
                <button
                  key={opt}
                  className={styles.optionBtn}
                  aria-pressed={lesson.currentAnswer === opt}
                  onClick={() => {
                    soundFX.play("tap", 0.35);
                    lesson.selectAnswer(q.id, opt);
                  }}
                  disabled={lesson.phase === "submitting"}
                >
                  <span className={styles.optionLabel}>{LABELS[i]}</span>
                  <FuriganaText text={opt} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gagal mengirim jawaban: sebelumnya diam saja dan kembali ke soal tanpa penjelasan */}
        {lesson.errorMsg && <Alert>{lesson.errorMsg}</Alert>}

        {/* Bilah Aksi Terkunci di Bawah (Zero-Scroll Docked Navigation) */}
        <div className={styles.dockedActionBar}>
          <div className={styles.dockedActionInner}>
            <button
              type="button"
              className={styles.dockedPrevBtn}
              onClick={() => {
                soundFX.play("tap", 0.35);
                lesson.prevQuiz();
              }}
              disabled={lesson.quizIndex === 0 || lesson.phase === "submitting"}
              aria-label="Soal sebelumnya"
            >
              ←
            </button>
            {lesson.isLastQuiz ? (
              <button
                type="button"
                className={styles.dockedSubmitBtn}
                onClick={() => {
                  soundFX.play("tap", 0.35);
                  lesson.submitQuiz();
                }}
                disabled={!lesson.allAnswered || lesson.phase === "submitting"}
              >
                {lesson.phase === "submitting" ? "Menilai…" : "Kumpulkan Latihan →"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.dockedNextBtn}
                onClick={() => {
                  soundFX.play("tap", 0.35);
                  lesson.nextQuiz();
                }}
                disabled={!lesson.currentAnswer && !lesson.currentSkipped}
              >
                Lanjut →
              </button>
            )}
          </div>
        </div>

        {/* Sebelumnya muncul juga hanya karena soal terakhir ini sendiri belum dijawab */}
        {lesson.isLastQuiz && lesson.unansweredOthers > 0 && (
          <p className={styles.muted} style={{ textAlign: "center" }}>
            Masih ada {lesson.unansweredOthers} soal lain yang belum dijawab. Periksa kembali soal sebelumnya.
          </p>
        )}
      </LessonShell>
    );
  }

  // ── Result ──
  if (lesson.phase === "result" && lesson.result) {
    return <ResultView lesson={lesson} title={chapterTitle} moduleTitle={moduleTitle} />;
  }

  // Keadaan yang tidak punya isi untuk ditampilkan (mis. bab tanpa soal): jangan biarkan layar kosong
  return (
    <section className={styles.emptyState} role="status">
      <h1 className={styles.emptyTitle}>{chapterTitle}</h1>
      <p className={styles.muted}>Bagian ini belum punya isi. Bab ini sedang disiapkan, coba bab lain dulu ya.</p>
      <Link href="/belajar" className={styles.scenarioCta}>
        Kembali ke peta belajar
      </Link>
    </section>
  );
}

function SpeakButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        soundFX.play("tap", 0.35);
        onClick();
      }}
      className={styles.speakBtn}
      title="Dengarkan"
      aria-label="Putar suara"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    </button>
  );
}

function ResultView({ lesson, title, moduleTitle }: { lesson: ReturnType<typeof useChapterLesson>; title: string; moduleTitle?: string | null }) {
  const { score, passed, xpEarned, passingScore, results, progress } = lesson.result!;
  const shownScore = useCountUp(score);
  const { updateUser, user } = useAuth();
  const { speak } = useSpeech();

  // Layar nilai penuh tampil dulu; pembahasan soal dibuka dari sana
  const [showReview, setShowReview] = useState(false);
  const [reviewTab, setReviewTab] = useState<"answers" | "learned" | "speak">("answers");
  const [speakIndex, setSpeakIndex] = useState(0);
  const [speakAnswer, setSpeakAnswer] = useState<string | null>(null);

  // Sekali per hasil: tambah XP di header dan beri tahu peta agar memutar animasi node terbuka
  useEffect(() => {
    if (progress) updateUser({ xpTotal: progress.xpTotal, streakCount: progress.streak });
    else if (xpEarned > 0 && user) updateUser({ xpTotal: user.xpTotal + xpEarned });
    if (passed && lesson.chapter) {
      try {
        sessionStorage.setItem(JUST_COMPLETED_KEY, lesson.chapter.id);
      } catch {
        /* penyimpanan sesi tidak tersedia */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.result]);

  const questionMap = new Map(lesson.quizQuestions.map((q) => [q.id, q]));
  const correct = results.filter((r) => r.correct).length;
  const graded = results.filter((r) => !r.skipped).length;

  // Kandidat kalimat untuk latihan tes speak mandiri bersama Miu-chan
  const speakCandidates = useMemo(() => {
    const list: { text: string; meaning: string; variants?: string[] }[] = [];
    lesson.quizQuestions.forEach((q) => {
      if (q.type === "berbicara" && q.speakText) {
        list.push({ text: q.speakText, meaning: q.question || "Ucapkan kalimat ini", variants: q.speakVariants });
      }
    });
    if (lesson.chapter?.vocabularies) {
      lesson.chapter.vocabularies.forEach((v) => {
        list.push({ text: v.word, meaning: v.meaningId, variants: [v.reading] });
      });
    }
    return list;
  }, [lesson.quizQuestions, lesson.chapter]);

  const learnedVocabs = lesson.chapter?.vocabularies ?? [];
  const learnedKanji = lesson.chapter?.kanji ?? [];

  if (!showReview) {
    return (
      <ScoreScreen
        score={score}
        passed={passed}
        passingScore={passingScore}
        xpEarned={xpEarned}
        correct={correct}
        graded={graded}
        chapterTitle={title}
        streak={progress?.streak}
        newAchievements={progress?.newAchievements}
        onRestartStudy={lesson.restartStudy}
        onRetryQuiz={lesson.retryQuiz}
        onShowReview={() => setShowReview(true)}
      />
    );
  }

  const currentSpeak = speakCandidates[speakIndex] ?? null;

  return (
    <LessonShell
      title={title}
      moduleTitle={moduleTitle}
      stage="result"
      tip={passed ? "Bagus! Latih lagi pola bab ini lewat ngobrol supaya makin lancar." : "Lihat pembahasan soal yang salah, lalu coba lagi. Kamu pasti bisa."}
      mood={passed ? "senang" : "berpikir"}
    >
      <div className={styles.resultHero} data-passed={passed || undefined}>
        {passed && (
          <div className={styles.confetti} aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => <span key={i} />)}
          </div>
        )}
        <Mascot mood={passed ? "senang" : "berpikir"} size={88} />
        <h2 className={styles.resultHeading}>{passed ? "Bab Selesai!" : `Belum Lulus: butuh ${passingScore}%`}</h2>
        <div className={styles.resultScore} aria-label={`Nilai ${score} persen`}>{shownScore}%</div>
        <p className={styles.resultSub}>
          {correct} dari {graded} benar · Nilai lulus {passingScore}%
        </p>
        <span className={styles.xpBadge}>+{xpEarned} XP</span>
      </div>

      {!passed && (
        <Alert tone="info">
          Nilaimu <strong>{score}%</strong>, kurang <strong>{passingScore - score} poin</strong> dari batas lulus {passingScore}%. Bab
          berikutnya <strong>masih terkunci</strong>. Kerjakan kuisnya sekali lagi; materinya tidak perlu diulang.
        </Alert>
      )}

      {/* ── TAB NAVIGASI REVIEW ── */}
      <div className={styles.reviewNavTabs} role="tablist" aria-label="Kategori Review">
        <button
          type="button"
          role="tab"
          aria-selected={reviewTab === "answers"}
          className={`${styles.reviewNavBtn} ${reviewTab === "answers" ? styles.reviewNavBtnActive : ""}`}
          onClick={() => setReviewTab("answers")}
        >
          <span>📝 Pembahasan ({results.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={reviewTab === "learned"}
          className={`${styles.reviewNavBtn} ${reviewTab === "learned" ? styles.reviewNavBtnActive : ""}`}
          onClick={() => setReviewTab("learned")}
        >
          <span>📚 Yang Dipelajari ({learnedVocabs.length + learnedKanji.length})</span>
        </button>

        {speakCandidates.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={reviewTab === "speak"}
            className={`${styles.reviewNavBtn} ${reviewTab === "speak" ? styles.reviewNavBtnActive : ""}`}
            onClick={() => setReviewTab("speak")}
          >
            <span>🎙️ Tes Speak Miu-chan ({speakCandidates.length})</span>
          </button>
        )}
      </div>

      {/* ── TAB 1: PEMBAHASAN SOAL KUIS ── */}
      {reviewTab === "answers" && (
        <div className={styles.reviewList}>
          {results.map((r) => {
            const q = questionMap.get(r.questionId);
            if (!q) return null;
            return (
              <div key={r.questionId} className={styles.reviewItem} data-correct={r.correct || r.skipped}>
                <span className={styles.reviewIcon}>
                  {r.skipped ? (
                    <MinusIcon size={18} strokeWidth={3} />
                  ) : r.correct ? (
                    <CheckIcon size={18} strokeWidth={3} />
                  ) : (
                    <CloseIcon size={18} strokeWidth={3} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className={styles.reviewSkill}>
                    <SkillIcon skill={EXERCISES[q.type].skill} /> {EXERCISES[q.type].label}
                  </p>
                  <p className={styles.reviewQ} lang="ja">
                    {q.type === "berbicara" ? q.speakText : q.question}
                  </p>
                  {r.skipped ? (
                    <p className={styles.reviewAnswer}>Dilewati, tidak ikut dinilai.</p>
                  ) : (
                    !r.correct && (
                      <p className={styles.reviewAnswer}>
                        {q.type === "berbicara" ? "Terdengar" : "Jawabanmu"}:{" "}
                        <em lang="ja">{lesson.answers.get(r.questionId) || "—"}</em> · Jawaban benar:{" "}
                        <strong lang="ja">{r.correctAnswer}</strong>
                      </p>
                    )
                  )}
                  {r.explanation && <p className={styles.reviewExplanation}>{r.explanation}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: MATERI YANG DIPELAJARI ── */}
      {reviewTab === "learned" && (
        <div className={styles.learnedSection}>
          <div className={styles.learnedSectionHeader}>
            <h3 className={styles.learnedSectionTitle}>Kosakata & Pola yang Kamu Pelajari:</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              {learnedVocabs.length} Kosakata · {learnedKanji.length} Kanji
            </span>
          </div>

          <div className={styles.vocabGrid}>
            {learnedVocabs.map((v) => (
              <div key={v.id} className={styles.vocabCard}>
                <div className={styles.vocabHead}>
                  <div>
                    <span className={styles.vocabWord} lang="ja">
                      <FuriganaText text={v.word} />
                    </span>
                    <span className={styles.vocabRomaji}>{v.reading}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.vocabAudioBtn}
                    onClick={() => speak(v.word)}
                    title="Dengarkan pengucapan kata"
                  >
                    <VolumeIcon size={15} />
                  </button>
                </div>
                <p className={styles.vocabMeaning}>{v.meaningId}</p>
              </div>
            ))}
          </div>

          {learnedKanji.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 10px" }}>Kanji Terkait:</h4>
              <div className={styles.kanjiGrid}>
                {learnedKanji.map((k) => (
                  <div key={k.id} className={styles.kanjiCard}>
                    <span className={styles.kanjiChar} lang="ja">{k.character}</span>
                    <span className={styles.kanjiMeaning}>{k.meaningId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: TES SPEAK MANDIRI DENGAN MIU-CHAN VOICE AI ── */}
      {reviewTab === "speak" && currentSpeak && (
        <div className={styles.speakPracticeCard}>
          <div className={styles.speakPracticeHeader}>
            <span className={styles.speakPracticeBadge}>
              <SparklesIcon size={14} /> Tes Pelafalan Mandiri ({speakIndex + 1}/{speakCandidates.length})
            </span>
            <p className={styles.speakPracticeHint}>
              Latih pengucapan kalimat berikut bersama Miu-chan Voice AI. Dengarkan contoh lalu rekam suaramu!
            </p>
          </div>

          <SpeakingExercise
            key={speakIndex}
            text={currentSpeak.text}
            variants={currentSpeak.variants}
            answer={speakAnswer}
            onAnswer={(ans) => setSpeakAnswer(ans)}
            onSkip={() => {}}
            skipped={false}
          />

          <div className={styles.speakPaginationRow}>
            <button
              type="button"
              className={styles.speakNavBtn}
              disabled={speakIndex === 0}
              onClick={() => {
                setSpeakIndex((i) => i - 1);
                setSpeakAnswer(null);
              }}
            >
              ← Kalimat Sebelumnya
            </button>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 700 }}>
              {speakIndex + 1} / {speakCandidates.length}
            </span>
            <button
              type="button"
              className={styles.speakNavBtn}
              disabled={speakIndex === speakCandidates.length - 1}
              onClick={() => {
                setSpeakIndex((i) => i + 1);
                setSpeakAnswer(null);
              }}
            >
              Kalimat Berikutnya →
            </button>
          </div>
        </div>
      )}

      {/* ── OPSI SETELAH REVIEW (MODERN ACTION HUB) ── */}
      <div className={styles.enhancedResultActions}>
        {passed ? (
          <Link href="/belajar" className={styles.actionCardPrimary}>
            <div className={styles.actionCardLeft}>
              <span className={styles.actionCardIcon}><GraduationCapIcon size={24} /></span>
              <div className={styles.actionCardTexts}>
                <span className={styles.actionCardTag}>Langkah Selanjutnya</span>
                <strong className={styles.actionCardTitle}>Lanjut ke Bab Berikutnya</strong>
                <span className={styles.actionCardDesc}>Lanjutkan progres kurikulum dan raih lebih banyak XP</span>
              </div>
            </div>
            <ArrowRightIcon size={20} className={styles.actionCardArrow} />
          </Link>
        ) : (
          <button type="button" className={styles.actionCardPrimary} onClick={lesson.retryQuiz}>
            <div className={styles.actionCardLeft}>
              <span className={styles.actionCardIcon}><RotateCwIcon size={24} /></span>
              <div className={styles.actionCardTexts}>
                <span className={styles.actionCardTag}>Tantangan Ulang</span>
                <strong className={styles.actionCardTitle}>Coba Kuis Sekali Lagi</strong>
                <span className={styles.actionCardDesc}>Kerjakan kuis kembali untuk meraih batas kelulusan {passingScore}%</span>
              </div>
            </div>
            <ArrowRightIcon size={20} className={styles.actionCardArrow} />
          </button>
        )}

        {lesson.chapter?.scenario && (
          <Link href={`/ngobrol/skenario/${lesson.chapter.scenario.id}`} className={styles.actionCardSecondary}>
            <div className={styles.actionCardLeft}>
              <span className={styles.actionCardIcon}><MessageIcon size={22} /></span>
              <div className={styles.actionCardTexts}>
                <span className={styles.actionCardTagScenario}>Latihan Situasi Nyata</span>
                <strong className={styles.actionCardTitle}>{lesson.chapter.scenario.title}</strong>
                <span className={styles.actionCardDesc}>Praktikkan pola bab ini dalam roleplay percakapan bersama Miu-chan</span>
              </div>
            </div>
            <ArrowRightIcon size={18} className={styles.actionCardArrow} />
          </Link>
        )}

        <div className={styles.actionRowBottom}>
          <button type="button" className={styles.actionSubBtn} onClick={lesson.retryQuiz}>
            <RotateCwIcon size={16} /> Ulangi Kuis Bab Ini
          </button>
          {lesson.studyCards.length > 0 && (
            <button type="button" className={styles.actionSubBtn} onClick={lesson.restartStudy}>
              <BookOpenIcon size={16} /> Pelajari Ulang Materi
            </button>
          )}
          <Link href="/belajar" className={styles.actionSubBtn}>
            Kembali ke Peta Belajar
          </Link>
        </div>
      </div>
    </LessonShell>
  );
}

/** Label keterampilan + perintah soal, supaya siswa tahu sedang melatih apa. Dipakai juga ujian naik level. */
export function QuestionHeader({ q }: { q: ChapterQuizQuestion }) {
  const meta = EXERCISES[q.type] ?? EXERCISES.pilihan_ganda;
  const skill = SKILLS[meta.skill];
  const instruction = q.type === "menulis" && q.script && q.script !== "campuran" ? `Tulis dengan ${q.script}` : meta.instruction;
  return (
    <>
      <span className={styles.skillBadge}>
        <SkillIcon skill={meta.skill} /> {skill.label} · {meta.label}
      </span>
      <p className={styles.instruction}>{instruction}</p>
      {q.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.imageUrl} alt="Gambar soal" className={styles.questionImage} decoding="async" />
      )}
      {q.type === "menulis" ? (
        <p className={styles.romajiPrompt}>{q.question}</p>
      ) : q.type === "berbicara" ? (
        q.question && <p className={styles.muted}>{q.question}</p>
      ) : (
        <p className={styles.question} lang="ja">
          <FuriganaText text={q.question} />
        </p>
      )}
      {q.hint && <p className={styles.hintText}>Arti / petunjuk: {q.hint}</p>}
    </>
  );
}
