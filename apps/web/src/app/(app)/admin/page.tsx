"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { adminApi, type SystemStats } from "@/features/admin/data/adminApi";
import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import { PageSkeleton, Skeleton } from "@/shared/ui/Skeleton";
import styles from "./admin.module.css";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/beranda");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      adminApi
        .getStats()
        .then(setStats)
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <PageSkeleton label="Memeriksa hak akses administrator…" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <AdminHeaderNav
        title={isSuperAdmin ? "Dashboard Super Admin" : "Dashboard Administrator"}
        subtitle="Ringkasan performa platform, aktivitas pengguna, dan operasional sistem NihonGo."
      />

      {/* Role Notice Banner (Tanpa Emoji) */}
      {isSuperAdmin ? (
        <div className={`${styles.roleNoticeBanner} ${styles.superAdminNotice}`}>
          <span>
            <strong>Otoritas Super Admin:</strong> Anda memiliki kontrol penuh tata kelola seluruh pengguna,
            promosi/demosi akun Admin, konfigurasi instruksi AI dan kecepatan TTS, pemberian status premium, serta inspeksi log forensik audit.
          </span>
        </div>
      ) : (
        <div className={`${styles.roleNoticeBanner} ${styles.adminNotice}`}>
          <span>
            <strong>Otoritas Administrator:</strong> Anda dapat mengelola akun murid & guru, memantau metrik performa, dan menangguhkan akun pelanggar.
            Konfigurasi model AI dan pengangkatan akun Admin dikunci sesuai hierarki keamanan.
          </span>
        </div>
      )}

      {/* KPI Cards Grid (Modern, Clean SVG, Tanpa Emoji) */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>TOTAL PENGGUNA</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className={styles.statValue}>{loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.totalUsers ?? 0}</span>
          <span className={styles.statFoot}>{stats?.activeUsers ?? 0} akun aktif</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>PELAJAR PREMIUM</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <span className={styles.statValue}>{loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.roleBreakdown.premium ?? 0}</span>
          <span className={styles.statFoot}>Langganan VIP aktif</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>SESI PERCAKAPAN</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className={styles.statValue}>{loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.totalConversations ?? 0}</span>
          <span className={styles.statFoot}>Dialog dengan maskot AI</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>MATERI KURIKULUM</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <span className={styles.statValue}>{loading ? <Skeleton width="4rem" height="2rem" style={{ margin: "2px 0" }} /> : stats?.totalChapters ?? 0}</span>
          <span className={styles.statFoot}>Bab tersedia (N5–N1)</span>
        </div>
      </div>

      {/* Panel Utama: Distribusi Peran & Navigasi Operasional */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Distribusi Akun */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Distribusi Peran Akun</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface-subtle, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
              <span className={`${styles.badge} ${styles.role_super_admin}`}>Super Admin</span>
              <strong>{stats?.roleBreakdown.super_admin ?? 0} akun</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface-subtle, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
              <span className={`${styles.badge} ${styles.role_admin}`}>Admin</span>
              <strong>{stats?.roleBreakdown.admin ?? 0} akun</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface-subtle, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
              <span className={`${styles.badge} ${styles.role_teacher}`}>Guru / Sensei</span>
              <strong>{stats?.roleBreakdown.teacher ?? 0} akun</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface-subtle, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
              <span className={`${styles.badge} ${styles.role_premium}`}>Pelajar Premium</span>
              <strong>{stats?.roleBreakdown.premium ?? 0} akun</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface-subtle, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
              <span className={`${styles.badge} ${styles.role_student}`}>Siswa Reguler</span>
              <strong>{stats?.roleBreakdown.student ?? 0} akun</strong>
            </div>
          </div>
        </div>

        {/* Menu Operasional Cepat */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Navigasi Operasional</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/admin/pengguna"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "var(--surface-subtle, #f8fafc)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: "10px",
                textDecoration: "none",
                color: "var(--text-main, #0f172a)",
                transition: "border-color 0.15s, transform 0.15s",
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>Kelola Pengguna</strong>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)" }}>
                  Cari akun, moderasi suspend, ubah peran, dan beri premium
                </span>
              </div>
              <span style={{ fontSize: "1.1rem", color: "var(--primary, #6366f1)" }}>→</span>
            </Link>

            <Link
              href="/admin/ai"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "var(--surface-subtle, #f8fafc)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: "10px",
                textDecoration: "none",
                color: "var(--text-main, #0f172a)",
                transition: "border-color 0.15s, transform 0.15s",
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>Konfigurasi AI</strong>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)" }}>
                  Instruksi sistem per tingkat JLPT, batasan kata, dan kecepatan TTS
                </span>
              </div>
              <span style={{ fontSize: "1.1rem", color: "var(--primary, #6366f1)" }}>→</span>
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin/audit"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "var(--surface-subtle, #f8fafc)",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: "var(--text-main, #0f172a)",
                  transition: "border-color 0.15s, transform 0.15s",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "0.95rem" }}>Audit Trail Keamanan</strong>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)" }}>
                    Inspeksi riwayat dan rekam jejak aksi sensitif administrator
                  </span>
                </div>
                <span style={{ fontSize: "1.1rem", color: "var(--primary, #6366f1)" }}>→</span>
              </Link>
            )}

            <Link
              href="/ngobrol"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "var(--surface-subtle, #f8fafc)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: "10px",
                textDecoration: "none",
                color: "var(--text-main, #0f172a)",
                transition: "border-color 0.15s, transform 0.15s",
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>Playground Uji AI</strong>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted, #64748b)" }}>
                  Uji dialog respons, TTS suara, dan deteksi kanji dengan maskot
                </span>
              </div>
              <span style={{ fontSize: "1.1rem", color: "var(--primary, #6366f1)" }}>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
