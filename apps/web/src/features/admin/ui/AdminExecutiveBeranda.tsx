"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { adminApi, type SystemStats } from "@/features/admin/data/adminApi";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton } from "@/shared/ui/Skeleton";
import styles from "./adminExecutiveBeranda.module.css";

export function AdminExecutiveBeranda() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuper = user?.role === "super_admin";

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      {/* Header Eksekutif */}
      <section className={styles.header}>
        <Mascot mood="senang" size={72} />
        <div className={styles.headerInfo}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span className={`${styles.roleTag} ${isSuper ? styles.tagSuper : styles.tagAdmin}`}>
              {isSuper ? "👑 Super Administrator" : "🛡️ Administrator"}
            </span>
            <div className={styles.statusIndicator}>
              <span className={styles.statusDot} />
              <span>Sistem Operasional</span>
            </div>
          </div>
          <h1 className={styles.greetingTitle}>Halo, {user?.displayName ?? "Admin"}!</h1>
          <p className={styles.greetingSub}>
            Pusat kendali operasional, tata kelola pengguna, dan pemantauan platform Nihongo.
          </p>
        </div>
      </section>

      {/* Informasi Pembatas Peran */}
      <div className={styles.noticeBox}>
        <span className={styles.noticeIcon} aria-hidden="true">💡</span>
        <div>
          <strong>Mode Manajemen Aktif:</strong> Akun Administrator tidak mengambil modul belajar, kartu kuis SRS, atau misi harian siswa. Anda dapat mengelola akun pengguna, mengatur konfigurasi AI, serta menguji respon percakapan Neko secara langsung.
        </div>
      </div>

      {/* Ringkasan Metrik Platform */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconRow}>
            <span className={styles.statLabel}>Total Pengguna</span>
            <span className={styles.statIcon}>👥</span>
          </div>
          <span className={styles.statValue}>
            {loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.totalUsers.toLocaleString("id") ?? "0"}
          </span>
          <span className={styles.statLabel}>Akun terdaftar</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconRow}>
            <span className={styles.statLabel}>Pengguna Aktif</span>
            <span className={styles.statIcon}>🟢</span>
          </div>
          <span className={styles.statValue}>
            {loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.activeUsers.toLocaleString("id") ?? "0"}
          </span>
          <span className={styles.statLabel}>Status normal</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconRow}>
            <span className={styles.statLabel}>Siswa Premium</span>
            <span className={styles.statIcon}>⭐</span>
          </div>
          <span className={styles.statValue}>
            {loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.roleBreakdown.premium.toLocaleString("id") ?? "0"}
          </span>
          <span className={styles.statLabel}>Pelajar VIP</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconRow}>
            <span className={styles.statLabel}>Percakapan AI</span>
            <span className={styles.statIcon}>💬</span>
          </div>
          <span className={styles.statValue}>
            {loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.totalConversations.toLocaleString("id") ?? "0"}
          </span>
          <span className={styles.statLabel}>Sesi dialog tersimpan</span>
        </div>
      </section>

      {/* Pintasan Aksi Manajemen */}
      <section className={styles.actionSection}>
        <h2 className={styles.actionTitle}>Menu Kendali Cepat</h2>
        <div className={styles.actionGrid}>
          <Link href="/admin/pengguna" className={styles.actionCard}>
            <div className={styles.actionCardIcon}>👥</div>
            <div className={styles.actionCardContent}>
              <strong className={styles.actionCardTitle}>Kelola Pengguna</strong>
              <span className={styles.actionCardDesc}>
                Ubah role akun, beri langganan premium, atau moderasi status suspend.
              </span>
            </div>
          </Link>

          <Link href="/admin/ai" className={styles.actionCard}>
            <div className={styles.actionCardIcon}>🤖</div>
            <div className={styles.actionCardContent}>
              <strong className={styles.actionCardTitle}>Konfigurasi AI</strong>
              <span className={styles.actionCardDesc}>
                Atur prompt instruksi Neko-sensei per level (N5–N1) dan kecepatan suara.
              </span>
            </div>
          </Link>

          {isSuper && (
            <Link href="/admin/audit" className={styles.actionCard}>
              <div className={styles.actionCardIcon}>📜</div>
              <div className={styles.actionCardContent}>
                <strong className={styles.actionCardTitle}>Audit Log Keamanan</strong>
                <span className={styles.actionCardDesc}>
                  Pantau rekam jejak setiap aksi administratif yang terjadi di sistem.
                </span>
              </div>
            </Link>
          )}

          <Link href="/ngobrol" className={styles.actionCard}>
            <div className={styles.actionCardIcon}>💬</div>
            <div className={styles.actionCardContent}>
              <strong className={styles.actionCardTitle}>Uji Respon Percakapan AI</strong>
              <span className={styles.actionCardDesc}>
                Lakukan pengujian langsung dialog chat, audio TTS Jepang, dan deteksi karakter.
              </span>
            </div>
          </Link>
        </div>

        <Link href="/admin/ringkasan" className={styles.fullPortalBtn}>
          <span>👑 Buka Ringkasan Sistem Lengkap →</span>
        </Link>
      </section>
    </div>
  );
}
