"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/features/notifications/application/NotificationsProvider";
import type { NotificationPreferences } from "@/features/notifications/domain/types";
import styles from "@/features/notifications/ui/notification.module.css";
import { Button } from "@/shared/ui/Button";

const ZONES = [
  { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Asia/Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura" },
  { value: "Asia/Tokyo", label: "Jepang — Asia/Tokyo" },
  { value: "UTC", label: "UTC" },
];

const TYPE_ROWS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "studyReminder", label: "Pengingat belajar harian", hint: "Satu kali sehari setelah jam pengingat, bila belum ada latihan." },
  { key: "streak", label: "Peringatan streak", hint: "Saat streak-mu berisiko putus karena belum belajar hari ini." },
  { key: "achievement", label: "Lencana baru", hint: "Saat kamu membuka pencapaian baru." },
  { key: "exam", label: "Hasil ujian & naik tahap", hint: "Saat lulus tes tahap, gerbang, atau simulasi JLPT." },
  { key: "announcement", label: "Pengumuman pengelola", hint: "Informasi penting tentang layanan dan materi baru." },
];

export default function NotificationSettingsPage() {
  const {
    preferences,
    savePreferences,
    pushState,
    pushServerEnabled,
    enablePush,
    disablePush,
    soundEnabled,
    toggleSound,
    playSound,
  } = useNotifications();

  const [form, setForm] = useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    if (preferences) setForm(preferences);
  }, [preferences]);

  const zones = ZONES.some((zone) => zone.value === form?.timezone)
    ? ZONES
    : [...ZONES, { value: form?.timezone ?? "Asia/Jakarta", label: form?.timezone ?? "Asia/Jakarta" }];

  const update = (patch: Partial<NotificationPreferences>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setStatus(null);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setStatus(null);
    try {
      const next = await savePreferences(form);
      setForm(next);
      setStatus({ kind: "ok", text: "Pengaturan notifikasi berhasil disimpan." });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Gagal menyimpan pengaturan." });
    } finally {
      setSaving(false);
    }
  };

  const togglePush = async () => {
    setPushMessage(null);
    try {
      if (pushState === "subscribed") {
        await disablePush();
        setPushMessage("Notifikasi di perangkat ini telah dinonaktifkan.");
      } else {
        await enablePush();
        setPushMessage("Notifikasi perangkat berhasil diaktifkan. Pengingat akan muncul di layar HP / laptop Anda.");
      }
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : "Gagal mengaktifkan notifikasi perangkat. Pastikan izin notifikasi diberikan pada browser Anda.");
    }
  };

  return (
    <div className={styles.page}>
      {/* ── KARTU 1: Notifikasi di Perangkat (HP / Laptop) ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Notifikasi di Layar Perangkat</h2>
          <p className={styles.cardHint}>
            Aktifkan agar pengingat belajar harian, peringatan streak, dan informasi penting muncul langsung di layar notifikasi HP atau komputer Anda.
          </p>
        </div>

        {!pushServerEnabled && (
          <p className={`${styles.notice} ${styles.noticeError}`}>
            Server belum mengatur kunci Web Push VAPID. Notifikasi dalam aplikasi tetap aktif.
          </p>
        )}

        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>
              {pushState === "subscribed" ? "Notifikasi Perangkat Aktif ✅" : "Pemberitahuan Sistem"}
            </span>
            <span className={styles.rowHint}>
              {pushState === "unsupported" && "Browser Anda belum mendukung notifikasi Web Push."}
              {pushState === "denied" && "Izin notifikasi diblokir di browser. Buka setelan izin situs browser Anda untuk mengizinkan notifikasi."}
              {pushState === "inactive" && "Aktifkan agar pengingat harian tetap muncul saat aplikasi sedang tertutup."}
              {pushState === "subscribed" && "Pengingat belajar akan muncul sebagai notifikasi pop-up di layar perangkat Anda."}
              {pushState === "loading" && "Memeriksa status perangkat…"}
            </span>
          </span>
          <Button
            type="button"
            variant={pushState === "subscribed" ? "secondary" : "primary"}
            onClick={() => void togglePush()}
            disabled={
              pushState === "loading" ||
              pushState === "unsupported" ||
              pushState === "denied" ||
              !pushServerEnabled
            }
          >
            {pushState === "subscribed" ? "Nonaktifkan" : "Aktifkan di Perangkat"}
          </Button>
        </div>

        {pushMessage && <p className={styles.status}>{pushMessage}</p>}
      </section>

      {/* ── KARTU 2: Suara Notifikasi ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Suara Notifikasi</h2>
          <p className={styles.cardHint}>
            Pemberitahuan audio bernuansa khas Jepang saat pengingat atau pesan baru masuk.
          </p>
        </div>

        <label className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Bunyikan suara notifikasi</span>
            <span className={styles.rowHint}>Putar efek audio lonceng saat notifikasi masuk.</span>
          </span>
          <input
            type="checkbox"
            className={styles.toggle}
            checked={soundEnabled}
            onChange={(e) => toggleSound(e.target.checked)}
          />
        </label>

        <div className={styles.divider} />

        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Lonceng Khas Jepang (Kettei Chime)</span>
            <span className={styles.rowHint}>
              Dengarkan contoh nada pemberitahuan resmi Nihongo.
            </span>
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void playSound()}
            disabled={!soundEnabled}
            title="Dengarkan contoh nada suara"
          >
            🔊 Dengarkan Nada
          </Button>
        </div>
      </section>

      {/* ── KARTU 3: Jam Pengingat Harian & Kategori ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Jadwal Pengingat Harian</h2>
          <p className={styles.cardHint}>Tentukan jam dan zona waktu belajar yang paling nyaman untuk Anda.</p>
        </div>

        {form ? (
          <>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reminderTime">
                Jam pengingat
              </label>
              <input
                id="reminderTime"
                type="time"
                className={styles.input}
                value={form.reminderTime}
                onChange={(event) => update({ reminderTime: event.target.value })}
              />
              <span className={styles.fieldHint}>Waktu setempat pengingat dikirim jika Anda belum belajar.</span>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="timezone">
                Zona waktu
              </label>
              <select
                id="timezone"
                className={styles.select}
                value={form.timezone}
                onChange={(event) => update({ timezone: event.target.value })}
              >
                {zones.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.divider} />

            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "16px 0 8px 0" }}>
              Pilih Jenis Notifikasi
            </h3>

            {TYPE_ROWS.map((row) => (
              <label key={row.key} className={styles.row}>
                <span className={styles.rowText}>
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={styles.rowHint}>{row.hint}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.switch}
                  checked={Boolean(form[row.key])}
                  onChange={(event) => update({ [row.key]: event.target.checked } as Partial<NotificationPreferences>)}
                />
              </label>
            ))}

            <div className={styles.saveBar}>
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan Pengaturan"}
              </Button>
              {status && (
                <span className={`${styles.status} ${status.kind === "ok" ? styles.statusOk : styles.statusError}`}>
                  {status.text}
                </span>
              )}
            </div>
          </>
        ) : (
          <p className={styles.status}>Memuat pengaturan…</p>
        )}
      </section>

      <p className={styles.count}>
        Ingin melihat riwayat? Buka <Link href="/notifikasi">semua notifikasi</Link>.
      </p>
    </div>
  );
}
