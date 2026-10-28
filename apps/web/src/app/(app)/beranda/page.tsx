"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { learningApi } from "@/features/learning/data/learningApi";
import type { Level, LevelProgress, NextChapter } from "@/features/learning/domain/types";
import { srsApi } from "@/features/srs/data/srsApi";
import { Alert } from "@/shared/ui/Alert";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
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
  const [due, setDue] = useState<number | null>(null);
  const [nextChapter, setNextChapter] = useState<NextChapter | null | undefined>(undefined);
  const [level, setLevel] = useState<Level | null>(null);
  const [progress, setProgress] = useState<LevelProgress | null | undefined>(undefined);

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
      return;
    }
    srsApi.due().then((r) => setDue(r.total)).catch(() => setDue(0));
    learningApi.nextChapter().then(setNextChapter).catch(() => setNextChapter(null));
  }, [isAdmin, router]);

  useEffect(() => {
    if (isAdmin || !levelId) {
      setProgress(null);
      return;
    }
    learningApi.levels().then((all) => setLevel(all.find((l) => l.id === levelId) ?? null)).catch(() => setLevel(null));
    learningApi.getProgress(levelId).then(setProgress).catch(() => setProgress(null));
  }, [isAdmin, levelId]);

  if (isAdmin) {
    return null;
  }

  const salam = greeting();
  const dailyTarget = user?.dailyTargetMin ?? 10;
  const streak = user?.streakCount ?? 0;
  const xp = user?.xpTotal ?? 0;
  const chatLocked = !!user && !user.isGuest && !user.emailVerified;

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

      {/* Aksi utama: bab berikutnya di jalur belajar. */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <span className={styles.heroKanji} aria-hidden="true" lang="ja">学</span>
        <div className={styles.heroBody}>
          <p className={styles.heroGreeting}>
            <span lang="ja">{salam.ja}、{user?.displayName}さん！</span>
            <span className={styles.heroGreetingId}>{salam.id}. Siap belajar hari ini?</span>
          </p>

          {nextChapter === undefined ? (
            <SkeletonRegion label="Mencari bab berikutnya…" style={{ display: "grid", gap: "var(--space-2)" }}>
              <Skeleton onColor width="9rem" height="0.875rem" />
              <Skeleton onColor width="min(18rem, 90%)" height="2rem" />
              <Skeleton onColor width="8rem" height="2.75rem" radius="var(--radius-pill)" style={{ marginTop: "var(--space-3)" }} />
            </SkeletonRegion>
          ) : nextChapter ? (
            <>
              <p className={styles.heroEyebrow}>Bab berikutnya · {nextChapter.levelCode}</p>
              <h1 id="hero-title" className={styles.heroTitle} lang="ja">{nextChapter.title}</h1>
              <Link href={`/belajar/${nextChapter.id}`} className={styles.heroCta}>
                Mulai bab
              </Link>
            </>
          ) : (
            <>
              <p className={styles.heroEyebrow}>Jalur belajar</p>
              <h1 id="hero-title" className={styles.heroTitle}>Semua bab yang terbuka sudah selesai</h1>
              <Link href="/belajar" className={styles.heroCta}>
                Lihat daftar bab
              </Link>
            </>
          )}
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
            <span className={styles.heroAvatarName}>{user?.displayName ?? "Profil"}</span>
          </Link>
        </div>
      </section>

      <div className={styles.overview}>
        <section className={styles.panel} aria-labelledby="progress-title">
          <div className={styles.panelHead}>
            <h2 id="progress-title" className={styles.panelTitle}>
              Progres {level?.code ?? "level"}
            </h2>
            <Link href="/belajar" className={styles.panelLink}>Semua bab</Link>
          </div>
          {progress === undefined ? (
            <SkeletonRegion label="Memuat progres…">
              <ul className={styles.meters}>
                {[0, 1, 2].map((i) => (
                  <li key={i} className={styles.meter}>
                    <div className={styles.meterHead}>
                      <Skeleton width="6rem" />
                      <Skeleton width="3rem" />
                    </div>
                    <Skeleton height={i === 0 ? 12 : 8} radius="var(--radius-pill)" />
                  </li>
                ))}
              </ul>
            </SkeletonRegion>
          ) : progress === null ? (
            <p className={styles.muted}>Progres belum bisa dimuat. Buka halaman Belajar untuk melihat bab-babmu.</p>
          ) : (
            <ul className={styles.meters}>
              <Meter label="Bab selesai" done={progress.chaptersCompleted} total={progress.chaptersTotal} main />
              {progress.vocabTarget > 0 && <Meter label="Kosakata" done={progress.vocabLearned} total={progress.vocabTarget} />}
              {progress.kanjiTarget > 0 && <Meter label="Kanji" done={progress.kanjiLearned} total={progress.kanjiTarget} />}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="habit-title">
          <h2 id="habit-title" className={styles.panelTitle}>Konsistensi</h2>
          <div className={styles.streak}>
            <span className={styles.streakIcon} data-active={streak > 0} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </span>
            <div>
              <p className={styles.streakValue}>
                {streak} <span>hari berturut-turut</span>
              </p>
              <p className={styles.muted}>
                {streak > 0 ? "Belajar lagi hari ini supaya tidak terputus." : "Selesaikan satu bab hari ini untuk memulai streak."}
              </p>
            </div>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Total XP</dt>
              <dd>{xp.toLocaleString("id")}</dd>
            </div>
            <div>
              <dt>Target harian</dt>
              <dd>
                {dailyTarget} menit <Link href="/profil" className={styles.factLink}>Ubah</Link>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="practice-title">
        <h2 id="practice-title" className={styles.panelTitle}>Latihan lain</h2>
        <ul className={styles.practiceList}>
          <li>
            <Link href="/review" className={styles.practice} data-highlight={!!due}>
              <span className={styles.practiceIcon} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="14" height="16" rx="2" />
                  <path d="M7 3h12a2 2 0 0 1 2 2v14" />
                </svg>
              </span>
              <span className={styles.practiceText}>
                <strong>Review kosakata</strong>
                <span>
                  {due === null ? <Skeleton width="80%" style={{ marginTop: 4 }} /> : due === 0 ? "Tidak ada kartu jatuh tempo. Kartu baru muncul setelah kamu menyelesaikan bab." : "Ulangi sebelum lupa."}
                </span>
              </span>
              {!!due && <span className={styles.count}>{due} kartu</span>}
            </Link>
          </li>
          <li>
            <Link href="/ngobrol" className={styles.practice}>
              <span className={styles.practiceIcon} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span className={styles.practiceText}>
                <strong>Ngobrol dengan Neko-sensei</strong>
                <span>{chatLocked ? "Terbuka setelah email terverifikasi." : "Latihan percakapan sesuai levelmu."}</span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/huruf" className={styles.practice}>
              <span className={`${styles.practiceIcon} ${styles.practiceKana}`} aria-hidden="true" lang="ja">あ</span>
              <span className={styles.practiceText}>
                <strong>Tabel huruf</strong>
                <span>Hiragana dan katakana beserta cara bacanya.</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>
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
