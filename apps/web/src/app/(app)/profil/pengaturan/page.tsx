"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { askConfirm } from "@/shared/ui/confirmDialog";
import type { Gender } from "@/features/auth/domain/types";
import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  LockIcon,
  LogoutIcon,
  PencilIcon,
  ShieldIcon,
  UserIcon,
} from "@/shared/ui/icons";
import { learningApi } from "@/features/learning/data/learningApi";
import styles from "./pengaturan.module.css";

const roleLabel = {
  guest: "Tamu",
  student: "Pelajar",
  premium: "Pelajar Premium",
  teacher: "Pengajar",
  admin: "Admin",
  super_admin: "Super Admin",
} as const;

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
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type SettingsTab = "profile" | "account" | "notification";

export default function PengaturanPage() {
  const { user, logout, updateAvatar, updateProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [levelCode, setLevelCode] = useState<string | null>(null);

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cooldown calculation (48 hours)
  const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;
  const genderUpdatedTime = user?.genderUpdatedAt ? new Date(user.genderUpdatedAt).getTime() : 0;
  const isGenderLocked = Boolean(genderUpdatedTime && Date.now() - genderUpdatedTime < COOLDOWN_MS);
  const remainingHours = isGenderLocked
    ? Math.max(1, Math.ceil((COOLDOWN_MS - (Date.now() - genderUpdatedTime)) / (1000 * 60 * 60)))
    : 0;

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setGender(user.gender ?? null);
    }
  }, [user]);

  useEffect(() => {
    const id = user?.currentLevelId;
    if (!id) return;
    learningApi
      .levels()
      .then((all) => setLevelCode(all.find((l) => l.id === id)?.code ?? null))
      .catch(() => setLevelCode(null));
  }, [user?.currentLevelId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!user) return null;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setNotice({ type: "error", text: "Nama panggilan minimal 2 karakter." });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        displayName: trimmed,
        gender: isGenderLocked ? undefined : gender,
      });
      setNotice({ type: "success", text: "Profil berhasil diperbarui!" });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Gagal memperbarui profil" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      setUploadingAvatar(true);
      const dataUrl = await processImageFile(file);
      await updateAvatar(dataUrl);
      setNotice({ type: "success", text: "Foto profil berhasil diperbarui!" });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Gagal mengunggah foto profil" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDeleteAvatar() {
    if (!user?.avatarUrl) return;
    const confirmed = await askConfirm({
      title: "Hapus foto profil?",
      description: "Foto akan diganti dengan inisial namamu.",
      confirmText: "Hapus Foto",
    });
    if (!confirmed) return;
    try {
      setUploadingAvatar(true);
      await updateAvatar(null);
      setNotice({ type: "success", text: "Foto profil berhasil dihapus." });
    } catch (err: unknown) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Gagal menghapus foto" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleLogout(allDevices: boolean) {
    const confirmed = await askConfirm({
      title: allDevices ? "Keluar dari semua perangkat?" : "Keluar dari akun?",
      description: allDevices
        ? "Seluruh sesi di HP, laptop, dan browser lain akan ditutup demi keamanan."
        : "Kamu perlu masuk kembali dengan email dan sandimu untuk melanjutkan.",
      confirmText: allDevices ? "Keluar Semua" : "Keluar",
    });
    if (!confirmed) return;
    await logout(allDevices);
    router.replace("/masuk");
  }

  const initial = (user.displayName?.[0] || "ね").toUpperCase();

  return (
    <section className={styles.wrap} aria-label="Pengaturan Akun dan Profil">
      {/* Top Header */}
      <div className={styles.topBar}>
        <Link href="/profil" className={styles.backBtn}>
          <ArrowLeftIcon size={16} /> Kembali ke Profil
        </Link>
        <h1 className={styles.pageTitle}>Pengaturan</h1>
      </div>

      {notice && (
        <Alert tone={notice.type === "success" ? "success" : "danger"}>
          {notice.text}
        </Alert>
      )}

      {/* Tabs Menu */}
      <nav className={styles.navTabs} aria-label="Pilihan Tab Pengaturan">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <UserIcon size={16} /> Profil Pengguna
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "account" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <LockIcon size={16} /> Akun & Keamanan
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "notification" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("notification")}
        >
          <BellIcon size={16} /> Notifikasi
        </button>
      </nav>

      {/* TAB 1: PROFIL PENGGUNA */}
      {activeTab === "profile" && (
        <div className={styles.panelCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Identitas & Personalisasi</h2>
            <p className={styles.sectionDesc}>Kelola nama tampilan, foto profil, dan panggilan ramah dari Miu-chan.</p>
          </div>

          {/* Avatar Management */}
          <div className={styles.avatarBlock}>
            <div className={styles.avatarCircle}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitial}>{initial}</span>
              )}
            </div>
            <div className={styles.avatarActions}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/webp"
                className={styles.hiddenInput}
                aria-hidden="true"
              />
              <button
                type="button"
                className={styles.btnActionPrimary}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <PencilIcon size={14} /> {user.avatarUrl ? "Ganti Foto" : "Unggah Foto"}
              </button>
              {user.avatarUrl && (
                <button
                  type="button"
                  className={styles.btnActionDanger}
                  onClick={handleDeleteAvatar}
                  disabled={uploadingAvatar}
                >
                  Hapus Foto
                </button>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className={styles.formGroup}>
              <TextField
                label="Nama Panggilan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Misal: Andi / Kenji"
                maxLength={40}
                required
              />
              <p className={styles.helperText}>Nama ini digunakan Miu-chan saat menyapa dan memberi semangat belajar.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Panggilan Ramah (Jenis Kelamin)</label>
              <div className={styles.genderOptions}>
                <button
                  type="button"
                  className={`${styles.genderBtn} ${gender === "male" ? styles.genderActive : ""}`}
                  onClick={() => setGender("male")}
                  disabled={isGenderLocked}
                >
                  👦 Laki-laki (お兄ちゃん)
                </button>
                <button
                  type="button"
                  className={`${styles.genderBtn} ${gender === "female" ? styles.genderActive : ""}`}
                  onClick={() => setGender("female")}
                  disabled={isGenderLocked}
                >
                  👧 Perempuan (お姉ちゃん)
                </button>
                <button
                  type="button"
                  className={`${styles.genderBtn} ${gender === null ? styles.genderActive : ""}`}
                  onClick={() => setGender(null)}
                  disabled={isGenderLocked}
                >
                  Netral / Belum diatur
                </button>
              </div>
              {isGenderLocked ? (
                <p className={styles.helperText} style={{ color: "#d97706" }}>
                  ⏳ Panggilan dikunci sementara. Dapat diubah kembali dalam {remainingHours} jam ke depan.
                </p>
              ) : (
                <p className={styles.helperText}>Miu-chan akan menyapamu secara sopan dan akrab sesuai panggilan pilihanmu.</p>
              )}
            </div>

            <div style={{ marginTop: "var(--space-2)" }}>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Menyimpan Perubahan…" : "Simpan Perubahan Profil"}
              </Button>
            </div>
          </form>

          {/* Level Info */}
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Level JLPT Pembelajaran</span>
              <span className={styles.infoValue}>{levelCode ? `JLPT ${levelCode}` : "Pemula"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tipe Keanggotaan</span>
              <span className={styles.infoValue}>{roleLabel[user.role] ?? user.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AKUN & KEAMANAN */}
      {activeTab === "account" && (
        <div className={styles.panelCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Keamanan & Kredensial Akun</h2>
            <p className={styles.sectionDesc}>Kelola alamat email, kata sandi, dan status akses perangkatmu.</p>
          </div>

          <div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Alamat Email</span>
              <span className={styles.infoValue}>{user.email ?? "Akun Tamu (Tanpa Email)"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status Verifikasi Email</span>
              <span className={styles.infoValue}>
                {user.emailVerified ? (
                  <span className={styles.badgeSuccess}><CheckIcon size={12} strokeWidth={3} /> Terverifikasi</span>
                ) : user.email ? (
                  <span className={styles.badgeWarning}>Belum Terverifikasi</span>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tipe Akun</span>
              <span className={styles.infoValue}>{user.isGuest ? "Akun Tamu Sementara" : "Akun Terdaftar Resmi"}</span>
            </div>
          </div>

          {/* Password Section */}
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
            <h3 className={styles.sectionTitle} style={{ fontSize: "0.95rem" }}>Kata Sandi Akun</h3>
            <p className={styles.helperText} style={{ marginBottom: "var(--space-2)" }}>
              Untuk keamanan optimal, gunakan kombinasi huruf besar, kecil, angka, dan simbol.
            </p>
            <Link href="/lupa-password" className={styles.btnActionPrimary} style={{ textDecoration: "none" }}>
              <LockIcon size={14} /> Reset / Ganti Kata Sandi
            </Link>
          </div>

          {/* Sesi Masuk */}
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
            <h3 className={styles.sectionTitle} style={{ fontSize: "0.95rem" }}>Manajemen Sesi Masuk</h3>
            <p className={styles.helperText} style={{ marginBottom: "var(--space-3)" }}>
              Amankan akun jika kamu baru saja menggunakan komputer umum atau mendeteksi aktivitas mencurigakan.
            </p>
            <div className={styles.logoutSection}>
              <Button
                variant="secondary"
                onClick={() => handleLogout(false)}
                style={{
                  color: "#dc2626",
                  borderColor: "#fecaca",
                  background: "#fef2f2",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 700,
                }}
              >
                <LogoutIcon size={16} strokeWidth={2.4} /> Keluar dari Perangkat Ini
              </Button>
              {!user.isGuest && (
                <Button variant="ghost" onClick={() => handleLogout(true)} style={{ color: "#dc2626" }}>
                  Keluar dari Semua Perangkat
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFIKASI */}
      {activeTab === "notification" && (
        <div className={styles.panelCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pengaturan Notifikasi & Pengingat</h2>
            <p className={styles.sectionDesc}>Konfigurasikan jadwal pengingat belajar harian, nada lonceng, dan push notification ke perangkat.</p>
          </div>

          <Link href="/profil/notifikasi" className={styles.notifCardLink}>
            <div className={styles.notifLeft}>
              <div className={styles.notifIconWrap}>
                <BellIcon size={20} />
              </div>
              <div className={styles.notifText}>
                <span className={styles.notifTitle}>Buka Pengaturan Lengkap Notifikasi</span>
                <span className={styles.notifSub}>Atur jam pengingat belajar, uji suara bel, dan toggle Web Push perangkat</span>
              </div>
            </div>
            <span style={{ fontSize: "1.2rem", color: "var(--color-primary)", fontWeight: 800 }}>→</span>
          </Link>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Pengingat Belajar Harian</span>
              <span className={styles.infoValue}>Aktif (Pengingat Streak)</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Izin Notifikasi Sistem</span>
              <span className={styles.infoValue}>
                {typeof window !== "undefined" && "Notification" in window ? (
                  Notification.permission === "granted" ? (
                    <span className={styles.badgeSuccess}>Diizinkan</span>
                  ) : Notification.permission === "denied" ? (
                    <span className={styles.badgeWarning}>Diblokir Browser</span>
                  ) : (
                    <span className={styles.badgeWarning}>Belum Diminta</span>
                  )
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Efek Suara Bell In-App</span>
              <span className={styles.infoValue}>Aktif (Suara Lembut)</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
