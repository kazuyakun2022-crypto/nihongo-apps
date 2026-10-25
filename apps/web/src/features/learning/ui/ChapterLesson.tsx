"use client";

import Link from "next/link";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { useSpeech } from "@/shared/lib/useSpeech";
import { useChapterLesson } from "../application/useChapterLesson";
import styles from "./chapter.module.css";

const LABELS = ["A", "B", "C", "D", "E"];

export function ChapterLesson({ chapterId }: { chapterId: string }) {
  const lesson = useChapterLesson(chapterId);
  const { speak } = useSpeech();

  // ── Loading ──
  if (lesson.phase === "loading") {
    return (
      <div className={styles.wrap}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "50dvh" }}>
          <Mascot mood="berpikir" size={80} />
        </div>
      </div>
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

  // ── Study cards ──
  if (lesson.phase === "study" && lesson.currentStudyCard) {
    const card = lesson.currentStudyCard;
    const progress = ((lesson.studyIndex + 1) / lesson.studyCards.length) * 100;

    return (
      <div className={styles.wrap}>
        <div className={styles.progressRow}>
          <Link href="/belajar" className={styles.closeBtn} aria-label="Tutup pelajaran">✕</Link>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={lesson.studyIndex + 1}
            aria-valuemax={lesson.studyCards.length}
          >
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{lesson.studyIndex + 1}/{lesson.studyCards.length}</span>
        </div>

        {lesson.chapter && lesson.studyIndex === 0 && lesson.chapter.explanation && (
          <div className={styles.explanationCard}>
            <p className={styles.explanationLabel}>Pengantar Bab</p>
            <p className={styles.explanationText}>{lesson.chapter.explanation}</p>
          </div>
        )}

        <div className={styles.studyCard} key={lesson.studyIndex}>
          {card.kind === "vocab" && (
            <>
              <span className={`${styles.cardBadge} ${styles.badgeVocab}`}>Kosakata</span>
              <p className={styles.cardMain} lang="ja">
                {card.data.word}
                <button
                  type="button"
                  onClick={() => speak(card.data.word)}
                  style={{ marginLeft: "0.5rem", fontSize: "1.25rem", background: "none", border: "none", cursor: "pointer", verticalAlign: "middle" }}
                  title="Dengarkan"
                  aria-label="Putar suara"
                >🔊</button>
              </p>
              <p className={styles.cardReading} lang="ja">{card.data.reading}</p>
              <p className={styles.cardMeaning}>{card.data.meaningId}</p>
              {card.data.exampleSentence && (
                <p className={styles.cardExample} lang="ja">「{card.data.exampleSentence}」</p>
              )}
            </>
          )}

          {card.kind === "kanji" && (
            <>
              <span className={`${styles.cardBadge} ${styles.badgeKanji}`}>Kanji</span>
              <p className={styles.cardMain} lang="ja">
                {card.data.character}
                <button
                  type="button"
                  onClick={() => speak(card.data.character)}
                  style={{ marginLeft: "0.5rem", fontSize: "1.25rem", background: "none", border: "none", cursor: "pointer", verticalAlign: "middle" }}
                  title="Dengarkan"
                  aria-label="Putar suara"
                >🔊</button>
              </p>
              <div className={styles.cardReadings}>
                {card.data.onyomi && (
                  <span className={styles.readingChip}><span>On</span>{card.data.onyomi}</span>
                )}
                {card.data.kunyomi && (
                  <span className={styles.readingChip}><span>Kun</span>{card.data.kunyomi}</span>
                )}
              </div>
              <p className={styles.cardMeaning}>{card.data.meaningId}</p>
            </>
          )}

          {card.kind === "grammar" && (
            <>
              <span className={`${styles.cardBadge} ${styles.badgeGrammar}`}>Tata Bahasa</span>
              <p className={styles.cardPattern} lang="ja">{card.data.pattern}</p>
              <p className={styles.cardExplanation}>{card.data.explanation}</p>
              {card.data.exampleSentence && (
                <p className={styles.cardExample} lang="ja">「{card.data.exampleSentence}」</p>
              )}
            </>
          )}
        </div>

        <div className={styles.dotNav}>
          {lesson.studyCards.map((_, i) => (
            <span
              key={i}
              className={i === lesson.studyIndex ? `${styles.dot} ${styles.dotActive}` : styles.dot}
            />
          ))}
        </div>

        <div className={styles.nav}>
          <Button variant="secondary" onClick={lesson.prevStudy} disabled={lesson.studyIndex === 0}>←</Button>
          <Button block onClick={lesson.nextStudy}>
            {lesson.isLastStudy ? "Lanjut ke Kuis →" : "Lanjut →"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Quiz intro ──
  if (lesson.phase === "quiz-intro") {
    return (
      <div className={styles.wrap}>
        <div className={styles.intro}>
          <Mascot mood="semangat" size={96} />
          <h1 className={styles.introHeading}>Siap untuk kuis?</h1>
          {lesson.chapter && (
            <p className={styles.introChapter}>{lesson.chapter.title}</p>
          )}
          <p className={styles.muted}>
            {lesson.quizQuestions.length} soal · Nilai lulus {lesson.result?.passingScore ?? 70}%
          </p>
        </div>
        <Button block onClick={lesson.startQuiz}>Mulai Kuis</Button>
        {lesson.studyCards.length > 0 && (
          <Button block variant="secondary" onClick={() => lesson.prevStudy()}>
            ← Ulang materi
          </Button>
        )}
      </div>
    );
  }

  // ── Quiz ──
  if ((lesson.phase === "quiz" || lesson.phase === "submitting") && lesson.currentQuestion) {
    const q = lesson.currentQuestion;
    const progress = ((lesson.quizIndex + 1) / lesson.quizQuestions.length) * 100;

    return (
      <div className={styles.wrap}>
        <div className={styles.progressRow}>
          <Link href="/belajar" className={styles.closeBtn} aria-label="Tutup kuis">✕</Link>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={lesson.quizIndex + 1}
            aria-valuemax={lesson.quizQuestions.length}
          >
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{lesson.quizIndex + 1}/{lesson.quizQuestions.length}</span>
        </div>

        <div className={styles.dotNav}>
          {lesson.quizQuestions.map((_, i) => (
            <span
              key={i}
              className={i === lesson.quizIndex ? `${styles.dot} ${styles.dotActive}` : styles.dot}
            />
          ))}
        </div>

        <div className={styles.quizCard}>
          <p className={styles.question} lang="ja">{q.question}</p>
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
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.nav}>
          <Button variant="secondary" onClick={lesson.prevQuiz} disabled={lesson.quizIndex === 0}>←</Button>
          {lesson.isLastQuiz ? (
            <Button
              block
              onClick={lesson.submitQuiz}
              disabled={!lesson.allAnswered || lesson.phase === "submitting"}
            >
              {lesson.phase === "submitting" ? "Menilai…" : "Kumpulkan →"}
            </Button>
          ) : (
            <Button block onClick={lesson.nextQuiz} disabled={!lesson.currentAnswer}>
              Lanjut →
            </Button>
          )}
        </div>

        {lesson.isLastQuiz && !lesson.allAnswered && (
          <p className={styles.muted} style={{ textAlign: "center" }}>
            Ada soal yang belum dijawab. Periksa kembali soal sebelumnya.
          </p>
        )}
      </div>
    );
  }

  // ── Result ──
  if (lesson.phase === "result" && lesson.result) {
    const { score, passed, xpEarned, passingScore, results } = lesson.result;
    const questionMap = new Map(lesson.quizQuestions.map((q) => [q.id, q]));
    const answerMap = lesson.answers;

    return (
      <div className={styles.wrap}>
        <div className={styles.resultHero}>
          <Mascot mood={passed ? "senang" : "berpikir"} size={80} />
          <h1 className={styles.resultHeading}>
            {passed ? "Bab selesai! 🎉" : "Belum lulus, ayo coba lagi!"}
          </h1>
          <div className={styles.resultScore}>{score}%</div>
          <p className={styles.resultSub}>
            {results.filter((r) => r.correct).length} dari {results.length} benar · Nilai lulus {passingScore}%
          </p>
          <span className={styles.xpBadge}>+{xpEarned} XP</span>
        </div>

        <div className={styles.reviewList}>
          {results.map((r) => {
            const q = questionMap.get(r.questionId);
            if (!q) return null;
            return (
              <div key={r.questionId} className={styles.reviewItem} data-correct={r.correct}>
                <span className={styles.reviewIcon}>{r.correct ? "✅" : "❌"}</span>
                <div>
                  <p className={styles.reviewQ} lang="ja">{q.question}</p>
                  {!r.correct && (
                    <p className={styles.reviewAnswer}>
                      Jawabanmu: <em>{answerMap.get(r.questionId) || "—"}</em> · Jawaban benar: <strong>{r.correctAnswer}</strong>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.resultActions}>
          <Link href="/belajar">
            <Button block>{passed ? "Lanjut ke bab berikutnya →" : "Kembali ke daftar bab"}</Button>
          </Link>
          {!passed && (
            <Button block variant="secondary" onClick={lesson.retryQuiz}>Coba kuis lagi</Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
