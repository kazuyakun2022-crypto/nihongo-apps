"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { learningApi } from "@/features/learning/data/learningApi";
import type { Level, LevelProgress, NextChapter } from "@/features/learning/domain/types";
import { Alert } from "@/shared/ui/Alert";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { BookOpenIcon, ChevronDownIcon, GraduationCapIcon, NotebookIcon, ScanCameraIcon } from "@/shared/ui/icons";
import { HomeBannerCarousel } from "@/features/banner/ui/HomeBannerCarousel";
import { HomeScenarioCarousel } from "@/features/conversation/ui/HomeScenarioCarousel";
import { StreakBadge } from "@/shared/ui/StreakFlame";
import styles from "./beranda.module.css";

/** Salam Jepang sesuai jam lokal. */
function greeting(): { ja: string; id: string } {
  const hour = new Date().getHours();
  if (hour < 11) return { ja: "おはよう", id: "Selamat pagi" };
  if (hour < 18) return { ja: "こんにちは", id: "Selamat siang" };
  return { ja: "こんばんは", id: "Selamat malam" };
}

const percent = (done: number, total: number) => (total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0);

export default function BerandaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const levelId = user?.currentLevelId ?? null;
  const [currentChapter, setCurrentChapter] = useState<NextChapter | null | undefined>(undefined);
  const [level, setLevel] = useState<Level | null>(null);
  const [progress, setProgress] = useState<LevelProgress | null | undefined>(undefined);
  const [showProgressDetail, setShowProgressDetail] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
      return;
    }
    learningApi.nextChapter().then(setCurrentChapter).catch(() => setCurrentChapter(null));
  }, [isAdmin, router]);

  useEffect(() => {
    if (isAdmin || !levelId) {
      setProgress(null);
      return;
    }
    learningApi
      .levels()
      .then((all) => {
        setLevel(all.find((l) => l.id === levelId) ?? null);
      })
      .catch(() => setLevel(null));
    learningApi.getProgress(levelId).then(setProgress).catch(() => setProgress(null));
  }, [isAdmin, levelId]);

  if (isAdmin) {
    return null;
  }

  const salam = greeting();
  const chatLocked = !!user && !user.isGuest && !user.emailVerified;

  const chapterPct =
    progress && progress.chaptersTotal > 0
      ? percent(progress.chaptersCompleted, progress.chaptersTotal)
      : 0;
  const vocabPct =
    progress && progress.vocabTarget > 0
      ? percent(progress.vocabLearned, progress.vocabTarget)
      : 0;
  const kanjiPct =
    progress && progress.kanjiTarget > 0
      ? percent(progress.kanjiLearned, progress.kanjiTarget)
      : 0;

  const activeMetrics = progress
    ? [
        progress.chaptersTotal > 0 ? chapterPct : null,
        progress.vocabTarget > 0 ? vocabPct : null,
        progress.kanjiTarget > 0 ? kanjiPct : null,
      ].filter((v): v is number => v !== null)
    : [];

  const overallProgressPct =
    activeMetrics.length > 0
      ? Math.min(100, Math.round(activeMetrics.reduce((sum, v) => sum + v, 0) / activeMetrics.length))
      : 0;

  return (
    <>
      {user?.role === "teacher" && (
        <div className={`${styles.roleBanner} ${styles.bannerTeacher}`}>
          <span>Mode Sensei: Seluruh kurikulum N5–N1 & Voice Chat aktif tanpa kuota.</span>
          <span className={styles.bannerActionText}>Pengajar Aktif</span>
        </div>
      )}

      {user?.role === "premium" && (
        <div className={`${styles.roleBanner} ${styles.bannerPremium}`}>
          <span>Akses VIP Premium: Seluruh materi N5–N1, Ujian Kenaikan Tahap, & Voice Chat aktif.</span>
          <span className={styles.bannerActionText}>VIP Aktif</span>
        </div>
      )}

      {user?.isGuest && (
        <Alert tone="info">
          Kamu sedang mencoba sebagai Tamu. <Link href="/daftar">Simpan progresmu</Link> sebelum terhapus dalam 30 hari.
        </Alert>
      )}
      {chatLocked && (
        <Alert tone="info">Cek email untuk verifikasi akun. Ngobrol dengan maskot terbuka setelah email terverifikasi.</Alert>
      )}

      {/* Sapaan ramah pengguna */}
      <section className={styles.hero} aria-labelledby="hero-greeting">
        <span className={styles.heroKanji} aria-hidden="true" lang="ja">学</span>

        <div className={styles.heroContent}>
          {/* Baris utama: Sapaan di kiri, Foto Profil di kanan */}
          <div className={styles.heroTop}>
            <div className={styles.heroGreeting}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h1 id="hero-greeting" lang="ja" className={styles.heroGreetingJa}>
                  <span className={styles.heroSalutation}>{salam.ja}、</span>
                  <span className={styles.heroUserWrap}>
                    <span className={styles.heroUserName}>{user?.displayName}</span>
                    <span className={styles.heroHonorific}>さん!</span>
                  </span>
                </h1>
                <StreakBadge count={user?.streakCount ?? 0} href="/profil" flameSize={18} />
              </div>
              <span className={styles.heroGreetingId}>
                {salam.id}. Siap belajar hari ini?
              </span>
            </div>

            <div className={styles.heroAvatarArea}>
              <Link
                href="/profil"
                className={styles.heroAvatarLink}
                title="Buka profil"
                aria-label="Profil saya"
              >
                <div className={styles.heroAvatarFrame}>
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName ?? "Foto profil"}
                      className={styles.heroAvatarImg}
                    />
                  ) : (
                    <div className={styles.heroAvatarInitial}>
                      {(user?.displayName?.[0] || "ね").toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Rekomendasi & Iklan Berputar Otomatis (hanya jika ada yang aktif) */}
      <HomeBannerCarousel />

      {/* Akses cepat ke latihan & referensi */}
      <section className={`${styles.panel} ${styles.quickAccessPanel}`} aria-label="Akses cepat" data-spotlight="beranda-latihan">
        <ul className={styles.quickGrid}>
          <li>
            <Link href="/belajar/tulis-buku" className={styles.quickAction} data-spotlight="beranda-tulis-buku" title="Latihan Tulis di Buku">
              <span className={styles.quickIconWrap}>
                <span className={`${styles.quickIcon} ${styles.quickIconTulisBuku}`} aria-hidden="true">
                  <NotebookIcon size={22} strokeWidth={2.2} />
                </span>
              </span>
              <span className={styles.quickLabel}>Tulis Buku</span>
            </Link>
          </li>
          <li>
            <Link href="/simulasi" className={styles.quickAction} data-spotlight="beranda-jlpt" title="Simulasi JLPT">
              <span className={styles.quickIconWrap}>
                <span className={`${styles.quickIcon} ${styles.quickIconJlpt}`} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="3" width="14" height="18" rx="2" />
                    <path d="M9 8h6M9 12h6M9 16h3" />
                  </svg>
                </span>
              </span>
              <span className={styles.quickLabel}>Simulasi JLPT</span>
            </Link>
          </li>
          <li>
            <Link href="/ngobrol" className={styles.quickAction} data-spotlight="beranda-ngobrol" title="Ngobrol AI">
              <span className={styles.quickIconWrap}>
                <span className={`${styles.quickIcon} ${styles.quickIconNgobrol}`} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
              </span>
              <span className={styles.quickLabel}>Ngobrol</span>
            </Link>
          </li>
          <li>
            <Link href="/scan" className={styles.quickAction} data-spotlight="beranda-scan" title="Kamera Scanner AI">
              <span className={styles.quickIconWrap}>
                <span className={`${styles.quickIcon} ${styles.quickIconScanner}`} aria-hidden="true">
                  <ScanCameraIcon size={22} strokeWidth={2.2} />
                </span>
              </span>
              <span className={styles.quickLabel}>Scanner</span>
            </Link>
          </li>
          <li>
            <Link href="/kamus" className={styles.quickAction} data-spotlight="beranda-kamus" title="Kamus">
              <span className={styles.quickIconWrap}>
                <span className={`${styles.quickIcon} ${styles.quickIconKamus}`} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </span>
              </span>
              <span className={styles.quickLabel}>Kamus</span>
            </Link>
          </li>
          <li>
            <Link href="/huruf" className={styles.quickAction} data-spotlight="beranda-huruf" title="Huruf Jepang">
              <span className={styles.quickIconWrap}>
                <span className={`${styles.quickIcon} ${styles.quickIconHuruf}`} aria-hidden="true">
                  <span className={styles.quickKana} lang="ja">あ</span>
                </span>
              </span>
              <span className={styles.quickLabel}>Huruf</span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Skenario Percakapan Interaktif (Situasi Nyata Jepang) */}
      <HomeScenarioCarousel />

      <div className={styles.overview}>
        {/* Bab Sekarang di atas */}
        <section
          className={`${styles.panel} ${styles.currentChapterPanel}`}
          aria-labelledby="current-chapter-title"
          data-spotlight="beranda-bab-sekarang"
        >
          <div className={styles.panelHead}>
            <div className={styles.panelHeadGroup}>
              <h2 id="current-chapter-title" className={styles.panelTitle}>
                Bab Sekarang
              </h2>
              {currentChapter && (
                <span className={styles.chapterBadge}>
                  {currentChapter.levelCode}
                </span>
              )}
            </div>
            <Link href="/belajar" className={styles.panelLink}>
              Daftar bab
            </Link>
          </div>

          {currentChapter === undefined ? (
            <SkeletonRegion label="Mencari bab sekarang…">
              <div className={styles.currentChapterSkeleton}>
                <Skeleton width="40%" height="0.85rem" />
                <Skeleton width="85%" height="1.4rem" />
                <Skeleton width="100%" height="0.9rem" />
                <Skeleton width="100%" height="2.75rem" radius="var(--radius-pill)" />
              </div>
            </SkeletonRegion>
          ) : currentChapter ? (
            <div className={styles.currentChapterContent}>
              <div className={styles.chapterInfo}>
                <div className={styles.currentChapterHeader}>
                  <div className={styles.chapterIconWrap} aria-hidden="true">
                    <BookOpenIcon size={24} />
                  </div>
                  <div className={styles.chapterMeta}>
                    <span className={styles.chapterEyebrow}>
                      Materi Aktif · {currentChapter.levelCode}
                    </span>
                    <h3 className={styles.chapterTitle} title={currentChapter.title} lang="ja">
                      {currentChapter.title}
                    </h3>
                  </div>
                </div>

                <p className={styles.chapterDesc}>
                  Lanjutkan materi sesi ini untuk mengasah pemahaman kosakata, tata bahasa, dan percakapan.
                </p>
              </div>

              <div className={styles.chapterActionArea}>
                <Link
                  href={`/belajar/${currentChapter.id}`}
                  className={styles.continueLearnBtn}
                  data-spotlight="beranda-lanjutkan"
                >
                  <span>Lanjutkan Belajar</span>
                  <span className={styles.continueArrow} aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.currentChapterContent}>
              <div className={styles.chapterInfo}>
                <div className={`${styles.chapterIconWrap} ${styles.chapterIconCompleted}`} aria-hidden="true">
                  <GraduationCapIcon size={24} />
                </div>
                <div className={styles.chapterMeta}>
                  <span className={styles.chapterEyebrow}>Tahap Belajar</span>
                  <h3 className={styles.chapterTitle}>Semua Bab Selesai!</h3>
                </div>
                <p className={styles.chapterDesc}>
                  Hebat! Seluruh bab di kurikulum terbuka telah kamu selesaikan. Buka daftar bab untuk mengulang atau melatih ingatanmu.
                </p>
              </div>
              <div className={styles.chapterActionArea}>
                <Link href="/belajar" className={styles.continueLearnBtn}>
                  <span>Buka Daftar Bab</span>
                  <span className={styles.continueArrow} aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Progres Level paling bawah */}
        <section className={`${styles.panel} ${styles.unifiedProgressPanel}`} aria-labelledby="progress-title" data-spotlight="beranda-progres">
          <div className={styles.panelHead}>
            <div className={styles.panelHeadGroup}>
              <h2 id="progress-title" className={styles.panelTitle}>
                Progres {level?.code ?? "level"}
              </h2>
              {progress && (
                <span className={styles.progressBadge}>
                  {overallProgressPct === 100 ? "Tuntas" : `${overallProgressPct}% selesai`}
                </span>
              )}
            </div>
            <Link href="/belajar" className={styles.panelLink}>Semua bab</Link>
          </div>
          {progress === undefined ? (
            <SkeletonRegion label="Memuat progres…">
              <div className={styles.unifiedSkeleton}>
                <Skeleton width="108px" height="108px" radius="50%" />
                <div style={{ display: "grid", gap: "8px", flex: 1 }}>
                  <Skeleton width="60%" height="1.25rem" />
                  <Skeleton width="80%" height="0.875rem" />
                  <Skeleton width="45%" height="2.25rem" radius="var(--radius-md)" />
                </div>
              </div>
            </SkeletonRegion>
          ) : progress === null ? (
            <p className={styles.muted}>Progres belum bisa dimuat. Buka halaman Belajar untuk melihat bab-babmu.</p>
          ) : (
            <div className={styles.unifiedProgressBody}>
              <div className={styles.unifiedProgressMain}>
                {/* Visual Animasi Air Utama */}
                <div className={styles.waterOrbContainer}>
                  <div className={styles.waterOrb} aria-hidden="true">
                    {/* Pantulan Kaca Specular */}
                    <div className={styles.waterGlassReflect} />

                    {/* Badan Air Bergelombang */}
                    <div
                      className={styles.waterBody}
                      style={{ height: `${Math.max(8, Math.min(100, overallProgressPct))}%` }}
                    >
                      {/* Pita Ombak SVG Berputar Mulus Tanpa Jeda */}
                      <div className={styles.waveRibbon}>
                        <svg className={`${styles.waveSvg} ${styles.waveFront}`} viewBox="0 0 1200 40" preserveAspectRatio="none">
                          <path d="M 0,20 Q 150,0 300,20 T 600,20 T 900,20 T 1200,20 L 1200,40 L 0,40 Z" />
                        </svg>
                        <svg className={`${styles.waveSvg} ${styles.waveBack}`} viewBox="0 0 1200 40" preserveAspectRatio="none">
                          <path d="M 0,20 Q 150,38 300,20 T 600,20 T 900,20 T 1200,20 L 1200,40 L 0,40 Z" />
                        </svg>
                      </div>

                      {/* Gelembung Udara Cairan Melayang */}
                      <span className={`${styles.waterBubble} ${styles.bubble1}`} />
                      <span className={`${styles.waterBubble} ${styles.bubble2}`} />
                      <span className={`${styles.waterBubble} ${styles.bubble3}`} />
                    </div>

                    {/* Lencana Persentase Kaca di Tengah Bola Air */}
                    <div className={styles.waterBadge}>
                      <div className={styles.waterPctRow}>
                        <span className={styles.waterPctVal}>{overallProgressPct}</span>
                        <span className={styles.waterPctSymbol}>%</span>
                      </div>
                      <span className={styles.waterLevelTag}>{level?.code ?? "N3"}</span>
                    </div>
                  </div>
                </div>

                {/* Rangkuman Singkat & Aksi Detail */}
                <div className={styles.unifiedSummaryCol}>
                  <div className={styles.unifiedStatsRow}>
                    <div className={styles.unifiedStatChip}>
                      <span className={styles.unifiedStatLabel}>Bab</span>
                      <strong className={styles.unifiedStatVal}>
                        {progress.chaptersCompleted}<span>/{progress.chaptersTotal}</span>
                      </strong>
                    </div>
                    {progress.vocabTarget > 0 && (
                      <div className={styles.unifiedStatChip}>
                        <span className={styles.unifiedStatLabel}>Kosakata</span>
                        <strong className={styles.unifiedStatVal}>
                          {progress.vocabLearned}<span>/{progress.vocabTarget}</span>
                        </strong>
                      </div>
                    )}
                    {progress.kanjiTarget > 0 && (
                      <div className={styles.unifiedStatChip}>
                        <span className={styles.unifiedStatLabel}>Kanji</span>
                        <strong className={styles.unifiedStatVal}>
                          {progress.kanjiLearned}<span>/{progress.kanjiTarget}</span>
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi Detail */}
                  <button
                    type="button"
                    className={styles.detailToggleBtn}
                    onClick={() => setShowProgressDetail((prev) => !prev)}
                    aria-expanded={showProgressDetail}
                    aria-controls="progress-detail-drawer"
                  >
                    <span>{showProgressDetail ? "Sembunyikan Rincian" : "Lihat Rincian Detail"}</span>
                    <ChevronDownIcon
                      size={16}
                      className={`${styles.detailToggleIcon} ${showProgressDetail ? styles.detailToggleIconRotated : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Drawer / Accordion Rincian Lengkap Yang Seperti Sekarang */}
              {showProgressDetail && (
                <div id="progress-detail-drawer" className={styles.progressDetailDrawer}>
                  <div className={styles.detailDrawerHeader}>
                    <span className={styles.detailDrawerTitle}>Rincian Metrik Pembelajaran</span>
                    <span className={styles.detailDrawerSub}>
                      Data penguasaan materi dihitung dari latihan dan bab yang kamu selesaikan
                    </span>
                  </div>
                  <ul className={styles.meters}>
                    <Meter label="Bab selesai" done={progress.chaptersCompleted} total={progress.chaptersTotal} main />
                    {progress.vocabTarget > 0 && (
                      <Meter label="Kosakata" done={progress.vocabLearned} total={progress.vocabTarget} />
                    )}
                    {progress.kanjiTarget > 0 && (
                      <Meter label="Kanji" done={progress.kanjiLearned} total={progress.kanjiTarget} />
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Meter({ label, done, total, main }: { label: string; done: number; total: number; main?: boolean }) {
  const pct = percent(done, total);
  return (
    <li className={styles.meter} data-main={main}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <span className={styles.meterValue}>
          {done}
          <span>/{total}</span>
        </span>
      </div>
      <div className={styles.meterTrack} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.meterFill} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
