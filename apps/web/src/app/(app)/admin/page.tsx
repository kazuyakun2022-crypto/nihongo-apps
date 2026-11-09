"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { adminApi, type SystemStats } from "@/features/admin/data/adminApi";
import { ArrowRightIcon, BookOpenIcon, MessageIcon, StarIcon, UsersIcon } from "@/shared/ui/icons";
import { PageSkeleton, Skeleton } from "@/shared/ui/Skeleton";
import styles from "./admin.module.css";

const ROLE_ROWS: { key: keyof SystemStats["roleBreakdown"]; label: string; cls: string }[] = [
  { key: "super_admin", label: "Super Admin", cls: "role_super_admin" },
  { key: "admin", label: "Admin", cls: "role_admin" },
  { key: "teacher", label: "Guru / Sensei", cls: "role_teacher" },
  { key: "premium", label: "Pelajar Premium", cls: "role_premium" },
  { key: "student", label: "Pelajar Reguler", cls: "role_student" },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
    }
  }, [user, isAdmin, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message || "Statistik belum bisa dimuat."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <PageSkeleton label="Memeriksa hak akses administrator…" />
      </div>
    );
  }

  // Saat memuat: kerangka; saat gagal: tanda pisah. Tidak menampilkan "0" palsu.
  const value = (n: number | undefined) =>
    loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : error || n === undefined ? "–" : n.toLocaleString("id");

  const nav = [
    { href: "/admin/pengguna", title: "Kelola Pengguna", desc: "Cari akun, moderasi penangguhan, ubah peran, dan beri premium" },
    { href: "/admin/materi", title: "Kelola Materi", desc: "Bab pelajaran, kamus kosakata, skenario percakapan, ujian, dan tes penempatan" },
    { href: "/admin/konten", title: "Kelola Konten & Iklan", desc: "Spanduk rekomendasi, promosi, dan iklan berputar di Beranda siswa" },
    { href: "/admin/ai", title: "Konfigurasi AI", desc: "Instruksi sistem per tingkat JLPT, batas kata, dan kecepatan suara" },
    ...(isSuperAdmin ? [{ href: "/admin/pantau", title: "Pantau Belajar", desc: "Level, progres bab, ujian, percakapan, dan pencapaian setiap pelajar" }] : []),
    { href: "/admin/notifikasi", title: "Kirim Pengumuman", desc: "Kirim notifikasi in-app dan push ke pelajar aktif" },
    { href: "/notifikasi", title: "Notifikasi Saya", desc: "Pengingat, lencana, dan pengumuman terbaru untuk akunmu" },
    { href: "/ngobrol", title: "Uji Miu-chan", desc: "Coba jawaban, suara, dan percakapan maskot seperti yang dilihat pelajar" },
  ];

  return (
    <div className={styles.container}>
      <div className={`${styles.roleNoticeBanner} ${isSuperAdmin ? styles.superAdminNotice : styles.adminNotice}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className={`${styles.authorityBadge} ${isSuperAdmin ? styles.authoritySuper : styles.authorityAdmin}`}>
            {isSuperAdmin ? "Super Admin" : "Administrator"}
          </span>
          <span style={{ fontSize: "0.85rem" }}>
            {isSuperAdmin
              ? "Pusat Kendali Eksekutif: Akses penuh pengguna, konfigurasi multi-key AI, dan pantau kurikulum."
              : "Pusat Manajemen: Pengelolaan akun pelajar, moderasi, dan peninjauan materi pembelajaran."}
          </span>
        </div>
        <button
          type="button"
          className={`${styles.btnSm} ${styles.btnSecondary}`}
          onClick={load}
          disabled={loading}
          title="Muat ulang data statistik"
        >
          {loading ? "Memuat…" : "Segarkan"}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>Statistik belum bisa dimuat: {error}</span>
          <button type="button" className={`${styles.btnSm} ${styles.btnSecondary}`} onClick={load}>
            Coba lagi
          </button>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>TOTAL PENGGUNA</span>
            <UsersIcon size={20} />
          </div>
          <span className={styles.statValue}>{value(stats?.totalUsers)}</span>
          <span className={styles.statFoot}>{stats && !loading ? `${stats.activeUsers.toLocaleString("id")} akun aktif` : "Akun terdaftar"}</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>PELAJAR PREMIUM</span>
            <StarIcon size={20} />
          </div>
          <span className={styles.statValue}>{value(stats?.roleBreakdown.premium)}</span>
          <span className={styles.statFoot}>Langganan aktif</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>SESI PERCAKAPAN</span>
            <MessageIcon size={20} />
          </div>
          <span className={styles.statValue}>{value(stats?.totalConversations)}</span>
          <span className={styles.statFoot}>Dialog dengan Miu-chan</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>MATERI KURIKULUM</span>
            <BookOpenIcon size={20} />
          </div>
          <span className={styles.statValue}>{value(stats?.totalChapters)}</span>
          {/* Angka dari server menghitung semua bab (termasuk draf & Pemula), jadi labelnya disebut apa adanya */}
          <span className={styles.statFoot}>Total bab, semua level & status</span>
        </div>
      </div>

      <div className={styles.dashGrid}>
        <section className={styles.panel} aria-labelledby="dist-title">
          <h2 id="dist-title" className={styles.panelTitle}>
            Distribusi Peran Akun
          </h2>
          <ul className={styles.roleList}>
            {ROLE_ROWS.map((r) => (
              <li key={r.key} className={styles.roleRow}>
                <span className={`${styles.badge} ${styles[r.cls]}`}>{r.label}</span>
                <strong>
                  {loading ? <Skeleton width="3rem" /> : error || !stats ? "–" : `${stats.roleBreakdown[r.key].toLocaleString("id")} akun`}
                </strong>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="nav-title">
          <h2 id="nav-title" className={styles.panelTitle}>
            Navigasi Cepat
          </h2>
          <ul className={styles.navCards}>
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={styles.navCard}>
                  <span>
                    <strong>{n.title}</strong>
                    <span className={styles.navCardDesc}>{n.desc}</span>
                  </span>
                  <ArrowRightIcon size={18} className={styles.navCardArrow} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
