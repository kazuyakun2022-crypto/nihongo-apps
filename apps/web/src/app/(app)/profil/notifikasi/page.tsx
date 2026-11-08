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
    sendTestNotification,
    soundEnabled,
    toggleSound,
    playSound,
    triggerDevice,
  } = useNotifications();

  const [form, setForm] = useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [triggeringDevice, setTriggeringDevice] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [deviceNotice, setDeviceNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

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
      setStatus({ kind: "ok", text: "Pengaturan notifikasi tersimpan." });
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
        setPushMessage("Push dimatikan di perangkat ini.");
      } else {
        await enablePush();
        setPushMessage("Push aktif. Notifikasi akan muncul di perangkat ini.");
      }
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : "Gagal mengatur push.");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const res = await sendTestNotification();
      setStatus({
        kind: "ok",
        text: `Notifikasi uji coba berhasil dikirim! Periksa ikon lonceng di atas.${
          res.pushSent > 0 ? " (Push sistem juga terkirim ke perangkat ini)" : ""
        }`,
      });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Gagal mengirim notifikasi uji coba." });
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerDevice = async () => {
    setTriggeringDevice(true);
    setDeviceNotice(null);
    try {
      await triggerDevice(
        "Miu-chan (Nihongo) 🔔",
        "Waktunya belajar sebentar! Latihan 5 menit hari ini sudah cukup untuk menjaga kebiasaanmu.",
      );
      setDeviceNotice({
        kind: "ok",
        text: "Notifikasi berhasil dipicu di layar perangkat dan di aplikasi dengan efek suara resmi Nihongo!",
      });
    } catch (err) {
      setDeviceNotice({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Gagal memunculkan notifikasi perangkat. Pastikan izin notifikasi diizinkan di browser Anda.",
      });
    } finally {
      setTriggeringDevice(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── KARTU 1: Tombol Langsung Memunculkan Notifikasi di Layar Perangkat + Desain Preview ── */}
      <section className={`${styles.card} ${styles.deviceCard}`}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Munculkan Notifikasi di Perangkat</h2>
          <p className={styles.cardHint}>
            Tekan tombol di bawah untuk langsung memunculkan pop-up notifikasi di layar perangkat Anda (Windows / HP) serta banner aplikasi bernuansa Jepang, lengkap dengan efek suara resmi tanpa nada dering bawaan sistem.
          </p>
        </div>

        {/* Desain Tampilan Notifikasi Aplikasi */}
        <div className={styles.devicePreview}>
          <div className={styles.devicePreviewHeader}>
            <span className={styles.devicePreviewBrand}>
              <span className={styles.devicePreviewSeal} aria-hidden="true" lang="ja">日</span>
              <span>Nihongo PWA</span>
            </span>
            <span>Baru saja</span>
          </div>
          <div className={styles.devicePreviewBody}>
            <span className={styles.devicePreviewTitle}>Miu-chan (Nihongo) 🔔</span>
            <span className={styles.devicePreviewText}>
              Waktunya belajar sebentar! Latihan 5 menit hari ini sudah cukup untuk menjaga kebiasaanmu.
            </span>
          </div>
          <div className={styles.devicePreviewActions}>
            <span className={styles.devicePreviewBtn}>Buka sekarang →</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.deviceTriggerBtn}
          onClick={() => void handleTriggerDevice()}
          disabled={triggeringDevice}
        >
          <span aria-hidden="true">🔔</span>
          <span>{triggeringDevice ? "Memunculkan notifikasi…" : "Munculkan Notifikasi di Perangkat Sekarang"}</span>
        </button>

        {deviceNotice && (
          <p
            className={`${styles.status} ${
              deviceNotice.kind === "ok" ? styles.statusOk : styles.statusError
            }`}
            style={{ marginTop: 10 }}
          >
            {deviceNotice.text}
          </p>
        )}
      </section>

      {/* ── KARTU 2: Suara Notifikasi Resmi Bawaan ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Suara Notifikasi</h2>
          <p className={styles.cardHint}>
            Suara pengingat resmi bawaan aplikasi (diatur oleh developer).
          </p>
        </div>

        <label className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Aktifkan suara notifikasi</span>
            <span className={styles.rowHint}>Putar efek suara saat notifikasi dan pengingat masuk.</span>
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
            <span className={styles.rowLabel}>Suara Resmi: Lonceng Jepang (Kettei Chime)</span>
            <span className={styles.rowHint}>
              Audio default resmi yang dipasang oleh developer di aset aplikasi.
            </span>
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void playSound()}
            disabled={!soundEnabled}
            title="Dengarkan suara resmi saat ini"
          >
            🔊 Uji Suara
          </Button>
        </div>
      </section>

      {/* ── KARTU 3: Pengaturan Push Perangkat ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Notifikasi di perangkat ini</h2>
          <p className={styles.cardHint}>
            Push hanya aktif di aplikasi yang dibuka dari layar utama (PWA). Di iOS perlu iOS 16.4+ dan
            &ldquo;Tambahkan ke Layar Utama&rdquo;. Notifikasi dalam aplikasi tetap masuk tanpa push.
          </p>
        </div>

        {!pushServerEnabled && (
          <p className={`${styles.notice} ${styles.noticeError}`}>
            Server belum mengatur kunci VAPID, jadi push dimatikan. Notifikasi in-app tetap berjalan.
          </p>
        )}

        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>
              {pushState === "subscribed" ? "Push aktif di perangkat ini" : "Push perangkat"}
            </span>
            <span className={styles.rowHint}>
              {pushState === "unsupported" && "Browser tidak mendukung Web Push."}
              {pushState === "denied" && "Izin notifikasi diblokir. Ubah lewat pengaturan situs di browser."}
              {pushState === "inactive" && "Aktifkan agar pengingat muncul meski aplikasi tertutup."}
              {pushState === "subscribed" && "Pengingat akan muncul sebagai notifikasi sistem."}
              {pushState === "loading" && "Memeriksa status langganan…"}
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
            {pushState === "subscribed" ? "Matikan push" : "Aktifkan push"}
          </Button>
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Uji coba in-app</span>
            <span className={styles.rowHint}>Kirim notifikasi ke inbox lonceng akun ini untuk memastikan data tersimpan.</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleTest()}
            disabled={testing}
          >
            {testing ? "Mengirim…" : "Kirim Uji Coba Lonceng"}
          </Button>
        </div>

        {pushMessage && <p className={styles.status}>{pushMessage}</p>}
      </section>

      {/* ── KARTU 4: Jam Pengingat Harian ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Pengingat harian</h2>
          <p className={styles.cardHint}>Pilih jam dan zona waktu. Pengingat dikirim sekali sehari bila kamu belum belajar.</p>
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
              <span className={styles.fieldHint}>Waktu setempat sesuai zona di bawah.</span>
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
                {saving ? "Menyimpan…" : "Simpan pengaturan"}
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
