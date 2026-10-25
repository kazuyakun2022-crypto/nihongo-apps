"use client";

import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { usePlacementExam } from "../application/usePlacementExam";
import styles from "./exam.module.css";

const LABELS = ["A", "B", "C", "D"];

interface Props {
  targetLevelId: number;
  targetLevelCode: string;
  sourceLevelCode: string;
  onPass: () => void;
  onStartLower: () => void;
}

export function PlacementTest({ targetLevelId, targetLevelCode, sourceLevelCode, onPass, onStartLower }: Props) {
  const exam = usePlacementExam(targetLevelId);

  if (exam.phase === "loading") {
    return (
      <div className={styles.wrap}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "40dvh" }}>
          <Mascot mood="berpikir" size={80} title="Memuat soal" />
        </div>
        <p className={styles.muted} style={{ textAlign: "center" }}>Menyiapkan soal tes…</p>
      </div>
    );
  }

  if (exam.phase === "error") {
    return (
      <div className={styles.wrap}>
        <Alert>{exam.errorMsg}</Alert>
        <Button onClick={exam.retry}>Coba lagi</Button>
      </div>
    );
  }

  if (exam.phase === "result" && exam.result) {
    const { passed, score, correct, total } = exam.result;
    return (
      <div className={styles.wrap}>
        <div className={styles.result}>
          <Mascot mood={passed ? "senang" : "berpikir"} size={96} />
          <div className={styles.resultIcon}>{passed ? "🎉" : "😢"}</div>
          <h1 className={styles.resultHeading}>
            {passed ? `Selamat! Kamu lulus tes ${sourceLevelCode}` : `Belum lulus tes ${sourceLevelCode}`}
          </h1>
          <div>
            <div className={styles.score}>{score}%</div>
            <div className={styles.scoreSub}>{correct} dari {total} benar · Nilai lulus {exam.result.passingScore}%</div>
          </div>
          {passed ? (
            <div className={styles.resultActions}>
              <p className={styles.muted}>
                Kamu siap belajar di level <strong>{targetLevelCode}</strong>. Selamat belajar!
              </p>
              <Button block onClick={onPass}>Mulai belajar {targetLevelCode}</Button>
            </div>
          ) : (
            <div className={styles.resultActions}>
              <p className={styles.muted}>
                Jangan menyerah! Kamu bisa mulai dari {sourceLevelCode} dulu, atau coba tesnya lagi.
              </p>
              <Button block onClick={onStartLower}>Mulai dari {sourceLevelCode}</Button>
              <Button block variant="secondary" onClick={exam.retry}>Ulangi tes</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const q = exam.currentQuestion;
  if (!q) return null;

  const progress = ((exam.currentIndex + 1) / exam.questions.length) * 100;
  const isLast = exam.currentIndex === exam.questions.length - 1;

  return (
    <div className={styles.wrap}>
      <div>
        <p className={styles.progressLabel}>
          Soal {exam.currentIndex + 1} / {exam.questions.length} · Tes Penempatan {sourceLevelCode}
        </p>
        <div className={styles.progressBar} role="progressbar" aria-valuenow={exam.currentIndex + 1} aria-valuemax={exam.questions.length}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.question} lang="ja">{q.question}</p>
        <div className={styles.options}>
          {q.options.map((opt, i) => (
            <button
              key={opt}
              className={styles.optionBtn}
              aria-pressed={exam.currentAnswer === opt}
              onClick={() => exam.selectAnswer(q.id, opt)}
            >
              <span className={styles.optionLabel}>{LABELS[i]}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.nav}>
        <Button variant="secondary" onClick={exam.prev} disabled={exam.currentIndex === 0}>
          ← Kembali
        </Button>
        {isLast ? (
          <Button
            block
            onClick={exam.submit}
            disabled={!exam.allAnswered || exam.phase === "submitting"}
          >
            {exam.phase === "submitting" ? "Menilai…" : "Kumpulkan Jawaban"}
          </Button>
        ) : (
          <Button block onClick={exam.next} disabled={!exam.currentAnswer}>
            Lanjut →
          </Button>
        )}
      </div>

      {isLast && !exam.allAnswered && (
        <p className={styles.muted} style={{ textAlign: "center" }}>
          Masih ada soal yang belum dijawab. Gulir ke atas untuk memeriksa.
        </p>
      )}
    </div>
  );
}
