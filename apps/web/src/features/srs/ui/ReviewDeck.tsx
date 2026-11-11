"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useLayerBack } from "@/shared/lib/useLayerBack";
import { useAssessment, useScreenContext } from "@/features/navigator/application/NavigatorProvider";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { NekoAvatar } from "@/shared/ui/neko/NekoAvatar";
import { AchievementUnlockModal } from "@/features/progress/ui/AchievementUnlockModal";
import { useCountUp } from "@/features/learning/ui/ScoreScreen";
import { soundFX } from "@/lib/audio/SoundFXManager";
import { SessionCelebrationModal } from "@/components/celebration/SessionCelebrationModal";
import { useReview, type ReviewedRecord } from "../application/useReview";
import { useDailyReview } from "../application/DailyReviewContext";
import { ReviewSpeakTest } from "./ReviewSpeakTest";
import type { ReviewGrade, DueCard } from "../domain/types";
import styles from "./srs.module.css";

const grades: { value: ReviewGrade; label: string; sub: string; className: string }[] = [
  { value: "lupa", label: "Lupa", sub: "< 1 hari", className: styles.gradeBtnLupa },
  { value: "sulit", label: "Sulit", sub: "1-2 hari", className: styles.gradeBtnSulit },
  { value: "bisa", label: "Bisa", sub: "3-4 hari", className: styles.gradeBtnBisa },
  { value: "mudah", label: "Mudah", sub: "5+ hari", className: styles.gradeBtnMudah },
];

export function ReviewDeck() {
  const {
    loading,
    error,
    retry,
    pending,
    current,
    totalCount,
    currentIndex,
    remaining,
    revealed,
    reveal,
    grade,
    summary,
    reviewAgain,
    latestProgress,
    unlockedAchievements,
  } = useReview();

  const [dismissedAchievements, setDismissedAchievements] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(true);
  const expEarned = summary.total ? summary.total * 10 : 50;
  const shownXp = useCountUp(current ? 0 : expEarned, 800, 200);

  const { completeObligation } = useDailyReview();
  const [speakTestCards, setSpeakTestCards] = useState<DueCard[] | null>(null);
  useLayerBack(speakTestCards !== null, () => setSpeakTestCards(null), "review-speak-test");
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Saat seluruh kartu habis / selesai, tandai kewajiban harian tuntas
  useEffect(() => {
    if (!loading && !current && !error) {
      completeObligation();
    }
  }, [loading, current, error, completeObligation]);

  // Audio pronunciation player
  const playWordAudio = useCallback((text: string, id: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}&voice=nanami`);
    audioPlayerRef.current = audio;
    setPlayingAudioId(id);

    audio.onended = () => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    };
    void audio.play().catch(() => setPlayingAudioId(null));
  }, []);

  // Keyboard shortcut listener (Space untuk lihat jawaban, 1..4 untuk beri nilai)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (speakTestCards) return; // Nonaktifkan saat sedang tes speak
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!revealed && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        soundFX.play("tap", 0.35);
        reveal();
      } else if (revealed && !pending && current) {
        if (e.key === "1") {
          soundFX.play("wrong", 0.4);
          grade("lupa");
        } else if (e.key === "2") {
          soundFX.play("wrong", 0.4);
          grade("sulit");
        } else if (e.key === "3") {
          soundFX.play("correct", 0.5);
          grade("bisa");
        } else if (e.key === "4") {
          soundFX.play("correct", 0.5);
          grade("mudah");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed, pending, current, reveal, grade, speakTestCards]);

  useAssessment("review", current && !revealed ? "latihan" : null);
  useScreenContext(
    "kartu",
    current
      ? `Kartu review: ${current.front}${
          revealed
            ? ` (${current.reading ?? ""} = ${current.meaning})`
            : " (jawaban belum dibuka; beri petunjuk)"
        }`
      : null
  );

  // ── MODAL / SCREEN TES SPEAK BERSAMA MIU-CHAN ──
  if (speakTestCards) {
    return (
      <ReviewSpeakTest
        cards={speakTestCards}
        onClose={() => setSpeakTestCards(null)}
        onFinish={(passed) => {
          // Tetap di modal selesai, user bisa menutupnya saat siap
        }}
      />
    );
  }

  if (loading) {
    return (
      <SkeletonRegion label="Memuat kartu review…" className={styles.deck}>
        <Skeleton width="10rem" height="1.5rem" />
        <div className={styles.card} style={{ justifyItems: "center" }}>
          <Skeleton width="9rem" height="3.5rem" />
          <Skeleton width="6rem" height="1.5rem" />
        </div>
        <Skeleton height="3.25rem" radius="var(--radius-pill)" />
      </SkeletonRegion>
    );
  }

  if (error) {
    return (
      <section className={styles.empty} role="alert">
        <Mascot mood="berpikir" size={96} />
        <h1 className={styles.heading}>Kartu belum bisa dimuat</h1>
        <p className={styles.muted}>{error}</p>
        <Button onClick={retry}>Coba lagi</Button>
      </section>
    );
  }

  // ── TAMPILAN SETELAH SELESAI (SIMPLE & CLEAN COMPLETION) ──
  if (!current) {
    const accuracy =
      summary.total > 0
        ? Math.round(((summary.bisa + summary.mudah) / summary.total) * 100)
        : 100;
    const expEarned = summary.total ? summary.total * 10 : 50;
    const difficultCount = summary.lupa + summary.sulit;

    return (
      <>
        {showCelebrationModal && (
          <SessionCelebrationModal
            xpEarned={expEarned}
            currentStreakDays={latestProgress?.streak ?? 1}
            levelProgressPct={accuracy}
            title="Review Tuntas!"
            subtitle="Kewajiban kosakata harian berhasil kamu selesaikan"
            levelName="Penguasaan SRS Harian"
            onContinue={() => setShowCelebrationModal(false)}
          />
        )}
        <div className={styles.simpleCompleteWrap} data-spotlight="review-selesai">
          <div className={styles.simpleCompleteCard}>
            <div className={styles.simpleAvatarWrap}>
              <NekoAvatar
                mode="idle"
                emotion="senang"
                size={110}
                label="Miu-chan Selamat!"
              />
            </div>

            <span className={styles.simpleBadge}>
              🎉 Review Hari Ini Selesai!
            </span>

            <h1 className={styles.simpleTitle}>Kerja Bagus!</h1>
            <p className={styles.simpleDesc}>
              Semua kosakata jatuh tempo hari ini telah berhasil kamu latih. Materi dan bab belajar kini terbuka bebas!
            </p>

            {/* 3 Metrik Esensial Ringkas */}
            <div className={styles.simpleStatsRow}>
              <div className={styles.simpleStatItem}>
                <span className={styles.simpleStatNum}>{summary.total}</span>
                <span className={styles.simpleStatLabel}>Kartu Selesai</span>
              </div>
              <div className={styles.simpleStatDivider} />
              <div className={styles.simpleStatItem}>
                <span className={styles.simpleStatNum} style={{ color: "#16a34a" }}>{accuracy}%</span>
                <span className={styles.simpleStatLabel}>Penguasaan</span>
              </div>
              <div className={styles.simpleStatDivider} />
              <div className={styles.simpleStatItem}>
                <span className={styles.simpleStatNum} style={{ color: "#ea580c" }}>+{shownXp}</span>
                <span className={styles.simpleStatLabel}>XP Didapat</span>
              </div>
            </div>

            {/* Tombol Aksi Simpel & Fokus */}
            <div className={styles.simpleActionCol}>
              <Link href="/belajar" className={styles.simpleBtnPrimary}>
                Lanjut Belajar Materi Bab →
              </Link>

              {difficultCount > 0 && (
                <button
                  type="button"
                  className={styles.simpleBtnSecondary}
                  onClick={() => reviewAgain(true)}
                >
                  🔄 Ulangi Kata Sulit ({difficultCount})
                </button>
              )}

              <Link href="/beranda" className={styles.simpleBtnGhost}>
                Kembali ke Beranda
              </Link>
            </div>
          </div>

          {!dismissedAchievements && unlockedAchievements && unlockedAchievements.length > 0 && (
            <AchievementUnlockModal
              achievements={unlockedAchievements}
              onClose={() => setDismissedAchievements(true)}
            />
          )}
        </div>
      </>
    );
  }

  // ── SESI BERJALAN: KARTU FLASHCARD REVIEW ──
  const progressPercent = totalCount > 0 ? Math.round((currentIndex / totalCount) * 100) : 0;

  return (
    <section className={styles.deck}>
      {/* Banner Kewajiban Harian */}
      <div className={styles.obligationBanner}>
        <span className={styles.obligationBadge}>
          <span className={styles.obligationDot} aria-hidden="true" />
          Kewajiban Belajar Harian
        </span>
        <p className={styles.obligationDesc}>
          Ada <strong>{remaining} kosakata</strong> yang perlu kamu kuatkan hari ini sebelum membuka materi lain.
        </p>
      </div>

      {/* Header Deck & Progress */}
      <div className={styles.deckHeader}>
        <div className={styles.deckHeaderMeta}>
          <span className={styles.muted}>
            Kartu {currentIndex + 1} dari {totalCount || remaining}
          </span>
          <span className={styles.remainingBadge}>Sisa {remaining} kartu</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Flashcard: Kotak Pertanyaan Berketinggian Tetap (Fixed-Height Sanctuary Canvas) */}
      <div className={styles.sanctuaryCard} data-spotlight="review-kartu-depan">
        {/* Tombol Cepat Audio di Pojok Kartu */}
        <div className={styles.cardQuickActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() =>
              playWordAudio(current.reading || current.front, current.id)
            }
            aria-label="Dengarkan pelafalan"
            title="Dengarkan pelafalan"
          >
            {playingAudioId === current.id ? "🔊" : "🔈"}
          </button>
        </div>

        {/* Zona Teks Depan Terpusat */}
        <div className={styles.sanctuaryFrontArea}>
          <p lang="ja" className={styles.front}>
            {current.front}
          </p>
        </div>

        {/* Zona Teks Belakang Terkunci (Slot Terpadu Tanpa Menggeser Layout) */}
        {revealed ? (
          <div className={styles.sanctuaryBackArea}>
            {current.reading && (
              <p lang="ja" className={styles.backReading}>
                {current.reading}
              </p>
            )}
            <p className={styles.backMeaning}>{current.meaning}</p>

            <button
              type="button"
              className={styles.speakPracticePill}
              onClick={() => setSpeakTestCards([current])}
              aria-label="Tes pelafalan kata ini dengan Miu-chan"
            >
              🎙️ Tes Speak Kata Ini Bersama Miu-chan
            </button>
          </div>
        ) : (
          <div className={styles.sanctuaryBackPlaceholder}>
            <span>🐾 Ketuk Spasi atau tombol di bawah untuk melihat jawaban</span>
          </div>
        )}
      </div>

      {/* Bilah Aksi Terkunci di Bawah (Sticky Docked Footer Bar) */}
      <div className={styles.dockedFooterBar}>
        <div className={styles.dockedFooterInner}>
          {revealed ? (
            <div className={styles.grades} data-spotlight="review-nilai">
              {grades.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  className={`${styles.gradeBtn} ${g.className}`}
                  onClick={() => {
                    if (g.value === "lupa" || g.value === "sulit") {
                      soundFX.play("wrong", 0.4);
                    } else {
                      soundFX.play("correct", 0.5);
                    }
                    grade(g.value);
                  }}
                  disabled={pending}
                >
                  <span className={styles.gradeLabel}>{g.label}</span>
                  <span className={styles.gradeSub}>{g.sub}</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              className={styles.revealActionBtn}
              onClick={() => {
                soundFX.play("tap", 0.35);
                reveal();
              }}
              data-spotlight="review-kartu"
            >
              Lihat Jawaban (Spasi)
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
