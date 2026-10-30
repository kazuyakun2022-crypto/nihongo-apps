"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FuriganaText, stripFurigana } from "@/features/conversation/ui/FuriganaText";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot, type MascotMood } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";
import { useSpeech } from "@/shared/lib/useSpeech";
import { EXERCISES, SKILLS, countBySkill, type SkillId } from "@/shared/lib/exercises";
import { useChapterLesson, type StudyCard } from "../application/useChapterLesson";
import type { ChapterQuizQuestion } from "../domain/types";
import { LessonBlockView } from "./LessonBlockView";
import { HandwritingExercise } from "./exercises/HandwritingExercise";
import { SpeakingExercise } from "./exercises/SpeakingExercise";
import { TileExercise } from "./exercises/TileExercise";
import styles from "./chapter.module.css";

const LABELS = ["A", "B", "C", "D", "E", "F"];

let quizAudio: HTMLAudioElement | null = null;
/** Audio soal mendengar: URL file biasa, atau /api/tts?text=… untuk suara buatan. */
function playAudio(url: string) {
  quizAudio?.pause();
  quizAudio = new Audio(url);
  void quizAudio.play().catch(() => {});
}

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

/** Skor hasil dihitung naik dari 0 supaya momen hasil terasa. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

/** Saran Miu-chan saat kuis, sesuai keterampilan yang sedang dilatih. */
const QUIZ_TIP: Record<SkillId, string> = {
  pemahaman: "Baca seluruh pilihan dulu. Pilihan yang mirip biasanya berbeda di partikel atau nuansanya.",
  mendengar: "Putar audionya sesering yang kamu perlu. Fokus pada kata kunci, bukan setiap kata.",
  menyusun: "Cari dulu predikat di akhir kalimat, lalu susun keterangan dan subjek di depannya.",
  menulis: "Perhatikan urutan goresan. Tulisan yang rapi lebih mudah dikenali.",
  berbicara: "Ucapkan dengan tempo biasa dan jelas. Kalau mikrofon tidak bisa dipakai, soal ini boleh dilewati.",
};

type Stage = "study" | "quiz" | "result";
const STAGES: { key: Stage; label: string }[] = [
  { key: "study", label: "Materi" },
  { key: "quiz", label: "Latihan" },
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
              <span className={styles.stageNum} aria-hidden>{i < stageIndex ? "✓" : i + 1}</span>
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
      <div className={styles.stage}>{children}</div>
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
  const { speak } = useSpeech();
  const chapterKanji = useMemo(() => lesson.chapter?.kanji.map((k) => k.character) ?? [], [lesson.chapter]);

  // Pintasan ← → untuk pindah kartu/soal (berguna di desktop)
  const { phase, studyIndex, quizIndex, currentAnswer, currentSkipped, isLastQuiz } = lesson;
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
          <Link href="/belajar" className={styles.closeBtn} aria-label="Tutup pelajaran">✕</Link>
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
                  「<FuriganaText text={card.data.exampleSentence} />」 <span aria-hidden>🔊</span>
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
                  「<FuriganaText text={card.data.exampleSentence} />」 <span aria-hidden>🔊</span>
                </button>
              )}
              {card.data.exampleTranslation && <p className={styles.cardTranslation}>{card.data.exampleTranslation}</p>}
            </>
          )}
        </div>

        <div className={styles.dotNav}>
          {lesson.studyCards.map((_, i) => (
            <span key={i} className={i === lesson.studyIndex ? `${styles.dot} ${styles.dotActive}` : styles.dot} />
          ))}
        </div>

        <div className={styles.nav}>
          <Button variant="secondary" onClick={lesson.prevStudy} disabled={lesson.studyIndex === 0} aria-label="Kartu sebelumnya">←</Button>
          <Button block onClick={lesson.nextStudy}>{lesson.isLastStudy ? "Lanjut ke Kuis →" : "Lanjut →"}</Button>
        </div>
        <p className={styles.keyHint}>Pintasan: tombol ← dan → di keyboard</p>
      </LessonShell>
    );
  }

  // ── Quiz intro ──
  if (lesson.phase === "quiz-intro") {
    return (
      <LessonShell title={chapterTitle} moduleTitle={moduleTitle} stage="quiz" tip="Tidak perlu terburu-buru. Kamu bisa kembali ke soal sebelumnya sebelum mengumpulkan." mood="semangat">
        <div className={styles.intro}>
          <div className={styles.introMascot}>
            <Mascot mood="semangat" size={112} />
          </div>
          <div className={styles.introBody}>
            <h2 className={styles.introHeading}>Siap berlatih?</h2>
            {lesson.chapter && <p className={styles.introChapter}>{lesson.chapter.title}</p>}
            <p className={styles.muted}>
              {lesson.quizQuestions.length} latihan · Nilai lulus {lesson.chapter?.passScore ?? 70}%
            </p>
            <ul className={styles.skillList} aria-label="Keterampilan yang dilatih">
              {countBySkill(lesson.quizQuestions.map((q) => q.type)).map(({ skill, count }) => (
                <li key={skill} className={styles.skillChip}>
                  <span aria-hidden>{SKILLS[skill].icon}</span> {SKILLS[skill].label} <strong>{count}</strong>
                </li>
              ))}
            </ul>
            <div className={styles.introActions}>
              <Button block onClick={lesson.startQuiz}>Mulai Latihan</Button>
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
        stage="quiz"
        steps={steps}
        tip={QUIZ_TIP[(EXERCISES[q.type] ?? EXERCISES.pilihan_ganda).skill]}
        mood="berpikir"
      >
        <div className={styles.progressRow}>
          <Link href="/belajar" className={styles.closeBtn} aria-label="Tutup kuis">✕</Link>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={lesson.quizIndex + 1} aria-valuemax={lesson.quizQuestions.length}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{lesson.quizIndex + 1}/{lesson.quizQuestions.length}</span>
        </div>

        <div className={styles.dotNav}>
          {lesson.quizQuestions.map((_, i) => (
            <span key={i} className={i === lesson.quizIndex ? `${styles.dot} ${styles.dotActive}` : styles.dot} />
          ))}
        </div>

        <div className={styles.quizCard} key={q.id} data-dir={lesson.direction}>
          <QuestionHeader q={q} />
          {q.audioUrl && (
            <button type="button" className={styles.audioBtn} onClick={() => playAudio(q.audioUrl ?? "")}>
              <span aria-hidden>🔊</span> Putar audio
            </button>
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
                  onClick={() => lesson.selectAnswer(q.id, opt)}
                  disabled={lesson.phase === "submitting"}
                >
                  <span className={styles.optionLabel}>{LABELS[i]}</span>
                  <FuriganaText text={opt} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.nav}>
          <Button variant="secondary" onClick={lesson.prevQuiz} disabled={lesson.quizIndex === 0} aria-label="Soal sebelumnya">←</Button>
          {lesson.isLastQuiz ? (
            <Button block onClick={lesson.submitQuiz} disabled={!lesson.allAnswered || lesson.phase === "submitting"}>
              {lesson.phase === "submitting" ? "Menilai…" : "Kumpulkan →"}
            </Button>
          ) : (
            <Button block onClick={lesson.nextQuiz} disabled={!lesson.currentAnswer && !lesson.currentSkipped}>
              Lanjut →
            </Button>
          )}
        </div>

        {lesson.isLastQuiz && !lesson.allAnswered && (
          <p className={styles.muted} style={{ textAlign: "center" }}>
            Ada soal yang belum dijawab. Periksa kembali soal sebelumnya.
          </p>
        )}
      </LessonShell>
    );
  }

  // ── Result ──
  if (lesson.phase === "result" && lesson.result) {
    return <ResultView lesson={lesson} title={chapterTitle} moduleTitle={moduleTitle} />;
  }

  return null;
}

function SpeakButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={styles.speakBtn} title="Dengarkan" aria-label="Putar suara">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    </button>
  );
}

function ResultView({ lesson, title, moduleTitle }: { lesson: ReturnType<typeof useChapterLesson>; title: string; moduleTitle?: string | null }) {
  const { score, passed, xpEarned, passingScore, results } = lesson.result!;
  const shownScore = useCountUp(score);
  const questionMap = new Map(lesson.quizQuestions.map((q) => [q.id, q]));
  const correct = results.filter((r) => r.correct).length;
  const graded = results.filter((r) => !r.skipped).length;

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
        <h2 className={styles.resultHeading}>{passed ? "Bab Selesai!" : "Belum Lulus, Ayo Coba Lagi!"}</h2>
        <div className={styles.resultScore} aria-label={`Nilai ${score} persen`}>{shownScore}%</div>
        <p className={styles.resultSub}>
          {correct} dari {graded} benar · Nilai lulus {passingScore}%
        </p>
        <span className={styles.xpBadge}>+{xpEarned} XP</span>
      </div>

      {lesson.chapter?.scenario && (
        <Link href={`/ngobrol/skenario/${lesson.chapter.scenario.id}`} className={styles.scenarioCta}>
          <span aria-hidden>💬</span>
          <span>
            <strong>Latihan ngobrol: {lesson.chapter.scenario.title}</strong>
            <small>Praktikkan pola bab ini langsung bersama Miu-chan.</small>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <div className={styles.resultActions}>
        <Link href="/belajar">
          <Button block>{passed ? "Lanjut ke bab berikutnya →" : "Kembali ke daftar bab"}</Button>
        </Link>
        <Button block variant="secondary" onClick={lesson.retryQuiz}>
          {passed ? "Ulangi Latihan Kuis" : "Coba latihan lagi"}
        </Button>
        {lesson.studyCards.length > 0 && (
          <Button block variant="ghost" onClick={lesson.restartStudy}>Pelajari Ulang Materi Bab</Button>
        )}
      </div>

      <h3 className={styles.reviewHeading}>Pembahasan</h3>
      <div className={styles.reviewList}>
        {results.map((r) => {
          const q = questionMap.get(r.questionId);
          if (!q) return null;
          return (
            <div key={r.questionId} className={styles.reviewItem} data-correct={r.correct || r.skipped}>
              <span className={styles.reviewIcon}>{r.skipped ? "–" : r.correct ? "✓" : "✕"}</span>
              <div>
                <p className={styles.reviewSkill}>
                  {SKILLS[EXERCISES[q.type].skill].icon} {EXERCISES[q.type].label}
                </p>
                <p className={styles.reviewQ} lang="ja">{q.type === "berbicara" ? q.speakText : q.question}</p>
                {r.skipped ? (
                  <p className={styles.reviewAnswer}>Dilewati, tidak ikut dinilai.</p>
                ) : (
                  !r.correct && (
                    <p className={styles.reviewAnswer}>
                      {q.type === "berbicara" ? "Terdengar" : "Jawabanmu"}: <em lang="ja">{lesson.answers.get(r.questionId) || "—"}</em> · Jawaban benar:{" "}
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
        <span aria-hidden>{skill.icon}</span> {skill.label} · {meta.label}
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
