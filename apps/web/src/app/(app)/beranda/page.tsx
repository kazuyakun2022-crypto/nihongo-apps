"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { learningApi } from "@/features/learning/data/learningApi";
import type { NextChapter } from "@/features/learning/domain/types";
import { srsApi } from "@/features/srs/data/srsApi";
import { Alert } from "@/shared/ui/Alert";
import { Mascot } from "@/shared/ui/Mascot";
import styles from "./beranda.module.css";

export default function BerandaPage() {
  const { user } = useAuth();
  const [due, setDue] = useState<number | null>(null);
  const [nextChapter, setNextChapter] = useState<NextChapter | null | undefined>(undefined);

  useEffect(() => {
    srsApi.due().then((r) => setDue(r.total)).catch(() => setDue(0));
    learningApi.nextChapter().then(setNextChapter).catch(() => setNextChapter(null));
  }, []);

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
          <span className={styles.statIcon}>🔥</span>
          <span className={styles.statValue}>{streak}</span>
          <span className={styles.statLabel}>Hari berturut</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>⚡</span>
          <span className={styles.statValue}>{xp.toLocaleString("id")}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🎯</span>
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
