"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Button } from "@/shared/ui/Button";
import styles from "./profil.module.css";

const roleLabel = {
  guest: "Tamu",
  student: "Pelajar",
  premium: "Pelajar Premium",
  teacher: "Pengajar",
  admin: "Admin",
} as const;

export default function ProfilPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  async function out(all: boolean) {
    await logout(all);
    router.replace("/masuk");
  }

  const initial = (user.displayName?.[0] || "ね").toUpperCase();

  const roleClass =
    user.role === "premium"
      ? styles.rolePremium
      : user.role === "student"
      ? styles.roleStudent
      : styles.roleGuest;

  return (
    <section className={styles.wrap} aria-label="Profil Pengguna">
      {/* Header */}
      <div className={styles.titleSection}>
        <span className={styles.titleJa} lang="ja">
          プロフィール
        </span>
        <h1 className={styles.title}>Profil</h1>
      </div>

      {/* Hero Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.avatar} aria-hidden="true">
          {user.isGuest ? "🐱" : initial}
        </div>
        <div className={styles.profileMeta}>
          <div className={styles.nameRow}>
            <h2 className={styles.displayName}>{user.displayName}</h2>
            <span className={`${styles.roleBadge} ${roleClass}`}>
              {roleLabel[user.role] ?? user.role}
            </span>
          </div>
          <p className={styles.userEmail}>{user.email ?? "Akun Tamu (Belum ada email)"}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon} role="img" aria-label="Streak">🔥</span>
          <span className={styles.statVal}>{user.streakCount ?? 0}</span>
          <span className={styles.statLabel}>Hari Streak</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} role="img" aria-label="XP">⚡</span>
          <span className={styles.statVal}>{user.xpTotal ?? 0}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} role="img" aria-label="Target">🎯</span>
          <span className={styles.statVal}>{user.dailyTargetMin ?? 10}m</span>
          <span className={styles.statLabel}>Target/Hari</span>
        </div>
      </div>

      {/* Guest Notice if guest */}
      {user.isGuest && (
        <div className={styles.guestBanner}>
          <h3 className={styles.guestBannerTitle}>Simpan Progres Belajar Kamu</h3>
          <p className={styles.guestBannerDesc}>
            Kamu sedang menggunakan akun tamu. Buat akun gratis agar data hafalan, streak, dan progres tidak hilang saat ganti perangkat atau membersihkan browser.
          </p>
          <Link href="/daftar" className={styles.guestBannerLink}>
            Daftar Akun Sekarang
          </Link>
        </div>
      )}

      {/* Account Details */}
      <div className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Nama Tampilan</span>
          <span className={styles.infoValue}>{user.displayName}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Alamat Email</span>
          <span className={styles.infoValue}>{user.email ?? "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Status Email</span>
          <span className={styles.infoValue}>
            {user.emailVerified ? (
              <span className={styles.badgeVerified}>✓ Terverifikasi</span>
            ) : user.email ? (
              <span className={styles.badgeUnverified}>Belum diverifikasi</span>
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Status Akun</span>
          <span className={styles.infoValue}>{roleLabel[user.role]}</span>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className={styles.shortcutsCard}>
        <h3 className={styles.shortcutTitle}>Akses Cepat</h3>
        <div className={styles.shortcutLinks}>
          <Link href="/belajar" className={styles.shortcutBtn}>
            📖 Mulai Belajar
          </Link>
          <Link href="/huruf" className={styles.shortcutBtn}>
            🔤 Latihan Huruf
          </Link>
          <Link href="/review" className={styles.shortcutBtn}>
            🔁 Review Kartu
          </Link>
          <Link href="/ngobrol" className={styles.shortcutBtn}>
            💬 Tanya Neko-sensei
          </Link>
          <Link href="/suara" className={styles.shortcutBtn}>
            🎙️ Ngobrol Suara
          </Link>
        </div>
      </div>

      {/* Logout Actions */}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => out(false)}>
          Keluar dari Akun Ini
        </Button>
        {!user.isGuest && (
          <Button variant="ghost" onClick={() => out(true)}>
            Keluar dari Semua Perangkat
          </Button>
        )}
      </div>
    </section>
  );
}
