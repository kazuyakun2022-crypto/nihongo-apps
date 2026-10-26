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
  super_admin: "Super Admin",
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
    user.role === "super_admin"
      ? styles.roleSuperAdmin
      : user.role === "admin"
      ? styles.roleAdmin
      : user.role === "teacher"
      ? styles.roleTeacher
      : user.role === "premium"
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
          {initial}
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
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </span>
          <span className={styles.statVal}>{user.streakCount ?? 0}</span>
          <span className={styles.statLabel}>Hari Streak</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span className={styles.statVal}>{user.xpTotal ?? 0}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <span className={styles.statVal}>{user.dailyTargetMin ?? 10}m</span>
          <span className={styles.statLabel}>Target/Hari</span>
        </div>
      </div>

      {/* Dedicated Role Privileges & Status Panel */}
      {user.role === "super_admin" && (
        <div className={`${styles.rolePrivilegeCard} ${styles.roleCardSuperAdmin}`}>
          <div className={styles.roleCardHeader}>
            <h3 className={styles.roleCardTitle}>
              Otoritas Super Admin
            </h3>
            <span className={styles.roleBadge} style={{ background: "#f59e0b", color: "#fff" }}>Akses Penuh</span>
          </div>
          <ul className={styles.perksList}>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Kontrol penuh seluruh pengguna: angkat & turunkan Admin/Guru</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Pengaturan instruksi AI Level N5–N1 & kecepatan TTS Azure</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Pemberian langganan status Premium manual tanpa batas</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Pemantauan seluruh riwayat audit log keamanan platform</li>
          </ul>
          <Link href="/admin" className={styles.portalCtaBtn} style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            Buka Dashboard Super Admin →
          </Link>
        </div>
      )}

      {user.role === "admin" && (
        <div className={`${styles.rolePrivilegeCard} ${styles.roleCardAdmin}`}>
          <div className={styles.roleCardHeader}>
            <h3 className={styles.roleCardTitle}>
              Panel Administrator Sistem
            </h3>
            <span className={styles.roleBadge} style={{ background: "#6366f1", color: "#fff" }}>Pengelola Platform</span>
          </div>
          <ul className={styles.perksList}>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Moderasi akun siswa, pencarian cepat & penangguhan (suspend)</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Pemantauan metrik dan ringkasan aktivitas siswa real-time</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Akses penuh seluruh materi pembelajaran level N5–N1</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Mode pantau konfigurasi prompt AI maskot Neko</li>
          </ul>
          <Link href="/admin" className={styles.portalCtaBtn} style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
            Buka Dashboard Administrator →
          </Link>
        </div>
      )}

      {user.role === "teacher" && (
        <div className={`${styles.rolePrivilegeCard} ${styles.roleCardTeacher}`}>
          <div className={styles.roleCardHeader}>
            <h3 className={styles.roleCardTitle}>
              Hak Akses Pengajar / Sensei
            </h3>
            <span className={styles.roleBadge} style={{ background: "#0284c7", color: "#fff" }}>Sensei Pendidik</span>
          </div>
          <ul className={styles.perksList}>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Akses bebas tanpa batas ke seluruh kurikulum JLPT N5 s/d N1</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Sesi Tanya Sensei & Ngobrol Suara tanpa limit harian</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Evaluasi bab materi dan pengujian fitur simulasi ujian</li>
          </ul>
        </div>
      )}

      {user.role === "premium" && (
        <div className={`${styles.rolePrivilegeCard} ${styles.roleCardPremium}`}>
          <div className={styles.roleCardHeader}>
            <h3 className={styles.roleCardTitle}>
              Keanggotaan Pelajar VIP Premium
            </h3>
            <span className={styles.roleBadge} style={{ background: "#16a34a", color: "#fff" }}>VIP Aktif</span>
          </div>
          <ul className={styles.perksList}>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Seluruh level JLPT (N5, N4, N3, N2, N1) terbuka penuh</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Latihan percakapan AI & Tanya Sensei tanpa batasan harian</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Pengulangan berjarak (SRS) kosakata & kanji tak terbatas</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Akses simulasi ujian kenaikan level & JLPT lengkap</li>
          </ul>
        </div>
      )}

      {user.role === "student" && (
        <div className={`${styles.rolePrivilegeCard} ${styles.roleCardStudent}`}>
          <div className={styles.roleCardHeader}>
            <h3 className={styles.roleCardTitle}>
              Status Pelajar Reguler
            </h3>
            <span className={styles.roleBadge}>Akun Gratis</span>
          </div>
          <ul className={styles.perksList}>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> Akses materi dasar JLPT N5 dan N4 terbuka</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>✓</span> 5 sesi Tanya Sensei AI per hari</li>
            <li className={styles.perkItem}><span className={styles.perkCheck}>•</span> Materi N3, N2, N1 & Ngobrol Suara tanpa batas (Perlu Premium)</li>
          </ul>
        </div>
      )}

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
          {(user.role === "admin" || user.role === "super_admin") && (
            <Link
              href="/admin"
              className={styles.shortcutBtn}
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              👑 Portal Admin
            </Link>
          )}
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
