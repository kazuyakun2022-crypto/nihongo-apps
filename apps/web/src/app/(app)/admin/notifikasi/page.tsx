"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { adminApi } from "@/features/admin/data/adminApi";
import { PageSkeleton } from "@/shared/ui/Skeleton";
import styles from "../admin.module.css";

export default function AdminNotifikasiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [reminderResult, setReminderResult] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user && !isAdmin) router.replace("/beranda");
  }, [user, isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <PageSkeleton label="Memeriksa hak akses administrator…" />
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const response = await adminApi.sendAnnouncement({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
      });
      setResult({
        kind: "ok",
        text: `Terkirim ke ${response.created} dari ${response.recipients} pelajar aktif. ${response.pushSent} push berhasil dikirim.`,
      });
      setTitle("");
      setBody("");
      setUrl("");
    } catch (err) {
      setResult({ kind: "error", text: err instanceof Error ? err.message : "Pengumuman gagal dikirim." });
    } finally {
      setSending(false);
    }
  };

  const triggerReminders = async () => {
    setRunningReminders(true);
    setReminderResult(null);
    try {
      const res = await adminApi.runReminders();
      setReminderResult({
        kind: "ok",
        text: `Pemeriksaan selesai: ${res.checked} pelajar diperiksa. ${res.created} pengingat dibuat, ${res.pushSent} Web Push berhasil dikirim ke perangkat tertutup.`,
      });
    } catch (err) {
      setReminderResult({ kind: "error", text: err instanceof Error ? err.message : "Gagal menjalankan pemeriksaan pengingat." });
    } finally {
      setRunningReminders(false);
    }
  };

  return (
    <div className={styles.container}>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Pengumuman baru</h2>
        <p className={styles.mutedSmall}>
          Pengumuman masuk ke kotak notifikasi pelajar yang mengizinkan pengumuman. Push hanya terkirim ke perangkat yang
          sudah berlangganan.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <label className={styles.controlField}>
            <span className={styles.fieldLabel}>Judul</span>
            <input
              className={styles.searchInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              minLength={3}
              required
              placeholder="Contoh: Pemeliharaan server malam ini"
            />
            <span className={styles.mutedSmall}>{title.length}/120</span>
          </label>

          <label className={styles.controlField}>
            <span className={styles.fieldLabel}>Isi pengumuman</span>
            <textarea
              className={styles.promptTextarea}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={500}
              minLength={3}
              required
              rows={4}
              placeholder="Tulis informasi singkat dan jelas untuk pelajar."
            />
            <span className={styles.mutedSmall}>{body.length}/500</span>
          </label>

          <label className={styles.controlField}>
            <span className={styles.fieldLabel}>Tautan tujuan (opsional)</span>
            <input
              className={styles.searchInput}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              maxLength={255}
              placeholder="/beranda"
            />
            <span className={styles.mutedSmall}>Harus diawali garis miring, mis. /belajar atau /notifikasi. Kosong = /notifikasi.</span>
          </label>

          <div>
            <button type="submit" className={styles.btnPrimary} disabled={sending}>
              {sending ? "Mengirim…" : "Kirim pengumuman"}
            </button>
          </div>

          {result && (
            <p className={result.kind === "ok" ? styles.noticeOk : styles.noticeError} role="status">
              {result.text}
            </p>
          )}
        </form>
      </section>

      <section className={styles.panel} style={{ marginTop: 20 }}>
        <h2 className={styles.panelTitle}>Pemeriksaan Pengingat Latar Belakang</h2>
        <p className={styles.mutedSmall}>
          Server menjalankan pemeriksaan otomatis setiap 5 menit. Pelajar yang jam pengingatnya telah tiba dan belum belajar hari ini akan otomatis menerima Web Push ke perangkatnya meski aplikasi sedang ditutup.
        </p>

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={triggerReminders}
            disabled={runningReminders}
          >
            {runningReminders ? "Memeriksa…" : "Jalankan Pemeriksaan Pengingat Sekarang"}
          </button>
        </div>

        {reminderResult && (
          <p className={reminderResult.kind === "ok" ? styles.noticeOk : styles.noticeError} style={{ marginTop: 12 }}>
            {reminderResult.text}
          </p>
        )}
      </section>
    </div>
  );
}
