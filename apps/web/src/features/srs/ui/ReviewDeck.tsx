"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useLayerBack } from "@/shared/lib/useLayerBack";
import { useAssessment, useScreenContext } from "@/features/navigator/application/NavigatorProvider";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { NekoAvatar } from "@/shared/ui/neko/NekoAvatar";
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
    reviewedItems,
    summary,
    reviewAgain,
  } = useReview();

  const { completeObligation } = useDailyReview();
  const [speakTestCards, setSpeakTestCards] = useState<DueCard[] | null>(null);
  useLayerBack(speakTestCards !== null, () => setSpeakTestCards(null), "review-speak-test");
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showRecap, setShowRecap] = useState(false);

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
        reveal();
      } else if (revealed && !pending && current) {
        if (e.key === "1") grade("lupa");
        else if (e.key === "2") grade("sulit");
        else if (e.key === "3") grade("bisa");
        else if (e.key === "4") grade("mudah");
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

  // ── TAMPILAN SETELAH SELESAI (COMPLETION HUB SUPER MENARIK) ──
  if (!current) {
    const itemsToShow: ReviewedRecord[] = reviewedItems;
    const accuracy =
      summary.total > 0
        ? Math.round(((summary.bisa + summary.mudah) / summary.total) * 100)
        : 100;

    return (
      <div className={styles.hubContainer} data-spotlight="review-selesai">
        {/* Hero Card */}
        <div className={styles.heroCard}>
          <div style={{ width: 140, height: 140, display: "grid", placeContent: "center" }}>
            <NekoAvatar
              mode="idle"
              emotion="senang"
              size={135}
              label="Miu-chan Selamat!"
            />
          </div>

          <span className={styles.heroBadge}>
            KEWAJIBAN HARIAN TUNTAS 🎉 · STREAK AKTIF
          </span>

          <h1 className={styles.heroTitle}>Sesi Review Berhasil Tuntas!</h1>
          <p className={styles.heroDesc}>
            Kerja bagus! Seluruh kosakata jatuh tempo hari ini telah kamu perkuat. Seluruh materi, bab, dan fitur belajar kini terbuka bebas.
          </p>

          {/* Stats 4-Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{summary.total || "Tuntas"}</span>
              <span className={styles.statLabel}>Total Kartu</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: "#16a34a" }}>
                {accuracy}%
              </span>
              <span className={styles.statLabel}>Penguasaan</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: "#ea580c" }}>
                +{summary.total ? summary.total * 10 : 50}
              </span>
              <span className={styles.statLabel}>EXP Didapat</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: "#2563eb" }}>
                100%
              </span>
              <span className={styles.statLabel}>Target Hari Ini</span>
            </div>
          </div>
        </div>

        {/* ── PILIHAN AKSI UTAMA DI ATAS (MUDAH DIAKSES TANPA SCROLL) ── */}
        <div className={styles.optionsSection}>
          <div className={styles.optionsGrid}>
            <Link href="/beranda" className={`${styles.actionTile} ${styles.actionTilePrimary}`}>
              <div className={styles.actionTileIcon} style={{ background: "#dcfce7", color: "#15803d" }}>
                🏠
              </div>
              <div className={styles.actionTileText}>
                <span className={styles.actionTileTitle}>Kembali ke Beranda</span>
                <span className={styles.actionTileDesc}>Selesai & cek statistik harian</span>
              </div>
            </Link>

            {summary.lupa + summary.sulit > 0 ? (
              <button
                type="button"
                className={styles.actionTile}
                onClick={() => reviewAgain(true)}
              >
                <div className={styles.actionTileIcon} style={{ background: "#fef3c7", color: "#b45309" }}>
                  🔄
                </div>
                <div className={styles.actionTileText}>
                  <span className={styles.actionTileTitle}>Review Ulang Kata Sulit</span>
                  <span className={styles.actionTileDesc}>
                    {summary.lupa + summary.sulit} kata perlu dimantapkan lagi
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                className={styles.actionTile}
                onClick={() => reviewAgain(false)}
              >
                <div className={styles.actionTileIcon} style={{ background: "#f3e8ff", color: "#7e22ce" }}>
                  🔄
                </div>
                <div className={styles.actionTileText}>
                  <span className={styles.actionTileTitle}>Review Ulang Semua</span>
                  <span className={styles.actionTileDesc}>Latih memori jangka panjang</span>
                </div>
              </button>
            )}

            <Link href="/belajar" className={styles.actionTile}>
              <div className={styles.actionTileIcon}>📖</div>
              <div className={styles.actionTileText}>
                <span className={styles.actionTileTitle}>Lanjut Materi Bab</span>
                <span className={styles.actionTileDesc}>Buka kurikulum dan bab baru</span>
              </div>
            </Link>
          </div>
        </div>

        {/* ── VIP FEATURED ACTION: TES SPEAK BERSAMA MIU-CHAN ── */}
        <button
          type="button"
          className={styles.vipCard}
          onClick={() => {
            const cardsForSpeak =
              itemsToShow.length > 0
                ? itemsToShow.map((r) => r.card)
                : [];
            setSpeakTestCards(cardsForSpeak);
          }}
          aria-label="Mulai Tes Speak Bersama Miu-chan"
        >
          <div className={styles.vipContent}>
            <span className={styles.vipBadge}>Fitur Unggulan Interaktif</span>
            <h3 className={styles.vipTitle}>🎙️ Tes Speak Bersama Miu-chan</h3>
            <p className={styles.vipDesc}>
              Uji langsung pelafalan lisanmu dengan Voice AI Miu-chan untuk kosakata yang baru kamu review. Interaktif, tidak kaku, dan langsung dievaluasi!
            </p>
          </div>
          <div className={styles.vipIconWrap} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
            </svg>
          </div>
        </button>

        {/* ── KOSAKATA YANG BARU DIPELAJARI / DIREVIEW (COLLAPSIBLE) ── */}
        {itemsToShow.length > 0 && (
          <div className={styles.recapSection}>
            <button
              type="button"
              className={styles.recapToggleBtn}
              onClick={() => setShowRecap((prev) => !prev)}
              aria-expanded={showRecap}
            >
              <div className={styles.recapToggleLeft}>
                <span className={styles.recapToggleIcon}>📚</span>
                <span className={styles.recapToggleText}>
                  Rincian Kosakata yang Direview
                </span>
                <span className={styles.recapCountBadge}>{itemsToShow.length} kata</span>
              </div>
              <span className={styles.recapToggleAction}>
                {showRecap ? "Tutup ▲" : "Lihat Daftar ▼"}
              </span>
            </button>

            {showRecap && (
              <div className={styles.recapGrid}>
                {itemsToShow.map(({ card, grade: g }) => (
                  <div key={card.id} className={styles.recapCard}>
                    <div className={styles.recapWordInfo}>
                      <span className={styles.recapFront} lang="ja">
                        {card.front}
                      </span>
                      {card.reading && (
                        <span className={styles.recapReading} lang="ja">
                          {card.reading}
                        </span>
                      )}
                      <span className={styles.recapMeaning}>{card.meaning}</span>
                    </div>

                    <div className={styles.recapRightActions}>
                      <span
                        className={`${styles.recapGradeBadge} ${
                          g === "lupa"
                            ? styles.badgeLupa
                            : g === "sulit"
                            ? styles.badgeSulit
                            : g === "bisa"
                            ? styles.badgeBisa
                            : styles.badgeMudah
                        }`}
                      >
                        {g}
                      </span>

                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          playWordAudio(card.reading || card.front, card.id)
                        }
                        aria-label={`Dengarkan pelafalan ${card.front}`}
                        title="Dengarkan pelafalan"
                      >
                        {playingAudioId === card.id ? "🔊" : "🔈"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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

      {/* Flashcard */}
      <div className={styles.card} data-spotlight="review-kartu-depan">
        {/* Tombol Cepat Audio & Mic di Pojok Kartu */}
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

        <p lang="ja" className={styles.front}>
          {current.front}
        </p>

        {revealed && (
          <div className={styles.back}>
            {current.reading && (
              <p lang="ja" className={styles.backReading}>
                {current.reading}
              </p>
            )}
            <p className={styles.backMeaning}>{current.meaning}</p>

            {/* Quick Tes Speak button right on card */}
            <button
              type="button"
              className={styles.speakPracticePill}
              onClick={() => setSpeakTestCards([current])}
              aria-label="Tes pelafalan kata ini dengan Miu-chan"
            >
              🎙️ Tes Speak Kata Ini Bersama Miu-chan
            </button>
          </div>
        )}
      </div>

      {/* Tombol Nilai (Lupa, Sulit, Bisa, Mudah) */}
      {revealed ? (
        <div className={styles.grades} data-spotlight="review-nilai">
          {grades.map((g) => (
            <button
              key={g.value}
              type="button"
              className={`${styles.gradeBtn} ${g.className}`}
              onClick={() => grade(g.value)}
              disabled={pending}
            >
              <span className={styles.gradeLabel}>{g.label}</span>
              <span className={styles.gradeSub}>{g.sub}</span>
            </button>
          ))}
        </div>
      ) : (
        <Button block onClick={reveal} data-spotlight="review-kartu">
          Lihat jawaban (Spasi)
        </Button>
      )}
    </section>
  );
}
