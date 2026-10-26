"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { learningApi } from "@/features/learning/data/learningApi";
import type { NextChapter } from "@/features/learning/domain/types";
import { srsApi } from "@/features/srs/data/srsApi";
import { Alert } from "@/shared/ui/Alert";
import { Mascot } from "@/shared/ui/Mascot";
import styles from "./beranda.module.css";

export default function BerandaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [due, setDue] = useState<number | null>(null);
  const [nextChapter, setNextChapter] = useState<NextChapter | null | undefined>(undefined);

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
      return;
    }
    srsApi.due().then((r) => setDue(r.total)).catch(() => setDue(0));
    learningApi.nextChapter().then(setNextChapter).catch(() => setNextChapter(null));
  }, [isAdmin, router]);

  if (isAdmin) {
    return null;
  }

  const dailyTarget = user?.dailyTargetMin ?? 10;
  const streak = user?.streakCount ?? 0;
  const xp = user?.xpTotal ?? 0;

  return (
    <>
      <section className={styles.greeting}>
        <Mascot mood="senang" size={84} />
        <div>
          <p className={styles.hello} lang="ja">
            おかえり、{user?.displayName}さん！
          </p>
          <p className={styles.muted}>Mau latihan apa hari ini?</p>
        </div>
      </section>

      {/* Role specific notification banners (No Emojis) */}
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
      {!user?.isGuest && user && !user.emailVerified && (
        <Alert tone="info">Cek email untuk verifikasi akun. Ngobrol dengan maskot terbuka setelah email terverifikasi.</Alert>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </span>
          <span className={styles.statValue}>{streak}</span>
          <span className={styles.statLabel}>Hari berturut</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span className={styles.statValue}>{xp.toLocaleString("id")}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <span className={styles.statValue}>{dailyTarget}</span>
          <span className={styles.statLabel}>Menit/hari</span>
        </div>
      </div>

      <div className={styles.actions}>
        {nextChapter !== undefined && (
          nextChapter ? (
            <Link href={`/belajar/${nextChapter.id}`} className={`${styles.action} ${styles.actionMain}`}>
              <span className={styles.actionEyebrow}>Lanjutkan belajar · {nextChapter.levelCode}</span>
              <strong>{nextChapter.title}</strong>
              <span>Bab berikutnya di jalur belajarmu →</span>
            </Link>
          ) : (
            <Link href="/belajar" className={`${styles.action} ${styles.actionMain}`}>
              <strong>Mulai belajar</strong>
              <span>Pilih bab pertamamu →</span>
            </Link>
          )
        )}

        <Link href="/ngobrol" className={styles.action}>
          <strong>Ngobrol dengan Neko-sensei</strong>
          <span>Latihan percakapan sesuai levelmu</span>
        </Link>
        <Link href="/review" className={styles.action}>
          <strong>Review kosakata</strong>
          <span>{due === null ? "Memuat…" : due === 0 ? "Tidak ada kartu jatuh tempo" : `${due} kartu menunggu`}</span>
        </Link>
      </div>
    </>
  );
}
