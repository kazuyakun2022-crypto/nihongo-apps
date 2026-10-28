"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Kompres dan crop gambar menjadi bujur sangkar 256x256 WebP berkualitas tinggi.
 * Menghasilkan data URL ~15-30KB yang ringan dan langsung tersimpan di database.
 */
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File yang dipilih harus berupa gambar (JPG, PNG, WebP)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak didukung"));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement("canvas");
        const targetDim = 256;
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal mengolah gambar"));
          return;
        }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetDim, targetDim);
        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilPage() {
  const { user, logout, updateAvatar } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isPhotoModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploading) {
        setIsPhotoModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPhotoModalOpen, uploading]);

  if (!user) return null;

  async function out(all: boolean) {
    await logout(all);
    router.replace("/masuk");
  }

  function handleTriggerFileInput() {
    setFeedback(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input agar file yang sama bisa dipilih ulang jika diinginkan
    e.target.value = "";

    try {
      setUploading(true);
      setFeedback(null);
      const dataUrl = await processImageFile(file);
      await updateAvatar(dataUrl);
      setFeedback({ type: "success", text: "Foto profil berhasil diperbarui!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah foto profil";
      setFeedback({ type: "error", text: msg });
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePhoto() {
    if (!user?.avatarUrl) return;
    const confirmDelete = window.confirm("Hapus foto profil dan gunakan inisial huruf?");
    if (!confirmDelete) return;

    try {
      setUploading(true);
      setFeedback(null);
      await updateAvatar(null);
      setFeedback({ type: "success", text: "Foto profil berhasil dihapus." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus foto profil";
      setFeedback({ type: "error", text: msg });
    } finally {
      setUploading(false);
    }
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
        <h1 className={styles.title}>Profil Pengguna</h1>
        <p className={styles.titleSub}>Kelola identitas, foto profil, dan status kemajuan belajarmu.</p>
      </div>

      <div className={styles.contentGrid}>
        {/* Kolom Kiri: Hero Kartu Profil, Avatar, dan Privilese */}
        <div className={styles.primaryCol}>
          {/* Hero Profile Card */}
          <div className={styles.profileCard}>
            <div className={styles.avatarWrapper}>
              <button
                type="button"
                id="profile-avatar-btn"
                className={styles.avatar}
                onClick={() => {
                  setFeedback(null);
                  setIsPhotoModalOpen(true);
                }}
                title="Klik untuk kelola foto profil"
                aria-label="Kelola foto profil"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarInitial}>{initial}</span>
                )}
              </button>
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
        </div>

        {/* Kolom Kanan: Rincian Akun, Akses Cepat, dan Aksi Keluar */}
        <div className={styles.secondaryCol}>
          {/* Account Details */}
          <div className={styles.infoCard}>
            <h3 className={styles.cardHeaderTitle}>Informasi Akun</h3>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Nama Panggilan</span>
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
              <span className={styles.infoLabel}>Tipe Keanggotaan</span>
              <span className={styles.infoValue}>{roleLabel[user.role]}</span>
            </div>
            {user.currentLevelId && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Level JLPT</span>
                <span className={styles.infoValue}>Level {user.currentLevelId}</span>
              </div>
            )}
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
          <div className={styles.actionsCard}>
            <h3 className={styles.cardHeaderTitle}>Sesi Masuk</h3>
            <p className={styles.actionsSub}>Keluar dari sesi browser ini atau amankan akun dengan keluar dari semua perangkat.</p>
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
          </div>
        </div>
      </div>

      {/* ── MODAL KHUSUS EDIT & HAPUS FOTO PROFIL ── */}
      {isPhotoModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!uploading) setIsPhotoModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-modal-title"
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            {/* Header Modal */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitleGroup}>
                <h3 id="photo-modal-title" className={styles.modalTitle}>
                  Foto Profil
                </h3>
                <p className={styles.modalSubtitle}>Atur atau perbarui foto profil akunmu</p>
              </div>
              <button
                type="button"
                id="close-photo-modal-btn"
                className={styles.modalCloseBtn}
                onClick={() => setIsPhotoModalOpen(false)}
                disabled={uploading}
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            {/* Body Modal */}
            <div className={styles.modalBody}>
              <div className={styles.modalAvatarPreviewWrap}>
                <div className={styles.modalAvatarCircle}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className={styles.modalAvatarImg}
                    />
                  ) : (
                    <span className={styles.modalAvatarInitial}>{initial}</span>
                  )}
                </div>
                <span className={styles.modalAvatarName}>{user.displayName}</span>
              </div>

              {/* Status / Alert Feedback */}
              {uploading && (
                <div className={`${styles.modalStatus} ${styles.modalStatusLoading}`}>
                  <span className={styles.spinnerMini} /> Sedang memperbarui foto profil...
                </div>
              )}
              {feedback && !uploading && (
                <div
                  className={`${styles.modalStatus} ${
                    feedback.type === "success" ? styles.modalStatusSuccess : styles.modalStatusError
                  }`}
                >
                  <span>{feedback.type === "success" ? "✓ " : "✕ "}</span>
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className={styles.modalActions}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className={styles.hiddenFileInput}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  id="upload-photo-modal-btn"
                  onClick={handleTriggerFileInput}
                  disabled={uploading}
                  className={styles.modalBtnPrimary}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {user.avatarUrl ? "Ganti Foto Baru" : "Pilih Foto Profil"}
                </button>

                {user.avatarUrl && (
                  <button
                    type="button"
                    id="delete-photo-modal-btn"
                    onClick={handleDeletePhoto}
                    disabled={uploading}
                    className={styles.modalBtnDanger}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Hapus Foto Profil
                  </button>
                )}

                <button
                  type="button"
                  id="dismiss-photo-modal-btn"
                  onClick={() => setIsPhotoModalOpen(false)}
                  disabled={uploading}
                  className={styles.modalBtnSecondary}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
