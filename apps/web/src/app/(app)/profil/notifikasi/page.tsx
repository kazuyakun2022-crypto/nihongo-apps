"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/features/notifications/application/NotificationsProvider";
import { isIosWithoutStandalone } from "@/features/notifications/application/pushSubscription";
import type { NotificationPreferences } from "@/features/notifications/domain/types";
import styles from "@/features/notifications/ui/notification.module.css";
import { Button } from "@/shared/ui/Button";
import { ArrowLeftIcon } from "@/shared/ui/icons";

const ZONES = [
  { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Asia/Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura" },
  { value: "Asia/Tokyo", label: "Jepang — Asia/Tokyo" },
  { value: "UTC", label: "UTC" },
];

const TYPE_ROWS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "srsReminder", label: "Pengingat Kartu SRS Jatuh Tempo", hint: "Saat kosakata atau kanji waktunya diulas agar tidak lupa." },
  { key: "studyReminder", label: "Pengingat belajar harian", hint: "Satu kali sehari setelah jam pengingat, bila belum ada latihan." },
  { key: "streak", label: "Peringatan perlindungan streak", hint: "Saat streak-mu berisiko putus karena belum belajar hari ini." },
  { key: "achievement", label: "Lencana baru", hint: "Saat kamu membuka pencapaian baru." },
  { key: "exam", label: "Hasil gerbang tulis, ujian & JLPT", hint: "Saat evaluasi buku tulis selesai atau lulus ujian." },
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
  } = useNotifications();

  const [form, setForm] = useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pushMessage, setPushMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setIosNeedsInstall(isIosWithoutStandalone());
  }, []);

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
        setPushMessage({ kind: "ok", text: "Notifikasi di perangkat ini telah dinonaktifkan." });
      } else {
        await enablePush();
        setPushMessage({
          kind: "ok",
          text: "Notifikasi perangkat berhasil diaktifkan. Pengingat akan muncul di layar HP / laptop Anda meski aplikasi ditutup.",
        });
      }
    } catch (err) {
      setPushMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Gagal mengaktifkan notifikasi perangkat. Pastikan izin notifikasi diberikan pada browser Anda.",
      });
    }
  };

  const handleTestPush = async () => {
    setTesting(true);
    setPushMessage(null);
    try {
      const res = await sendTestNotification();
      if (res.pushSent > 0) {
        setPushMessage({
          kind: "ok",
          text: `Web Push berhasil dikirim ke ${res.pushSent} perangkat! Periksa bilah notifikasi HP/komputer Anda (akan tetap masuk walau aplikasi ditutup).`,
        });
      } else if (res.localShown) {
        setPushMessage({
          kind: "ok",
          text: !res.pushEnabled
            ? "Notifikasi pop-up browser berhasil muncul! Untuk Web Push saat aplikasi ditutup, kunci VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY perlu dipasang di server API."
            : "Notifikasi browser berhasil muncul! Aktifkan tombol 'Aktifkan di Perangkat' di atas agar push bisa masuk saat aplikasi ditutup.",
        });
      } else {
        setPushMessage({
          kind: "error",
          text: !res.pushEnabled
            ? "Kunci Web Push VAPID belum diatur di server dan izin notifikasi browser belum aktif."
            : "Perangkat ini belum terdaftar Web Push atau izin notifikasi ditolak browser.",
        });
      }
    } catch (err) {
      setPushMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Gagal mengirim notifikasi uji coba.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: "var(--space-3)" }}>
        <Link
          href="/profil"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.86rem",
            fontWeight: 700,
            color: "var(--color-primary)",
            textDecoration: "none",
          }}
        >
          <ArrowLeftIcon size={16} /> Kembali ke Profil
        </Link>
      </div>

      {/* ── KARTU 1: Notifikasi di Perangkat (HP / Laptop) ── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Notifikasi di Layar Perangkat</h2>
          <p className={styles.cardHint}>
            Aktifkan agar pengingat belajar harian, peringatan streak, dan informasi penting muncul langsung di layar notifikasi HP atau komputer Anda, bahkan saat aplikasi sedang ditutup.
          </p>
        </div>

        {iosNeedsInstall && (
          <p className={styles.notice}>
            <strong>Khusus iPhone / iPad:</strong> Notifikasi Web Push hanya bisa aktif setelah aplikasi dipasang. Ketuk ikon <strong>Bagikan (Share)</strong> di Safari lalu pilih <strong>Tambahkan ke Layar Utama</strong>, lalu buka dari ikon aplikasi.
          </p>
        )}

        {!pushServerEnabled && (
          <p className={`${styles.notice} ${styles.noticeError}`}>
            Server belum mengatur kunci Web Push VAPID (<code>VAPID_PUBLIC_KEY</code> &amp; <code>VAPID_PRIVATE_KEY</code>). Push background saat aplikasi ditutup belum aktif.
          </p>
        )}

        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>
              {pushState === "subscribed" ? "Notifikasi Perangkat Aktif ✅" : "Pemberitahuan Sistem (Web Push)"}
            </span>
            <span className={styles.rowHint}>
              {pushState === "unsupported" &&
                (iosNeedsInstall
                  ? "Pasang aplikasi ke Layar Utama terlebih dahulu agar iOS mendukung notifikasi."
                  : "Browser Anda belum mendukung notifikasi Web Push (pastikan memakai HTTPS / Chrome / Safari iOS 16.4+).")}
              {pushState === "denied" && "Izin notifikasi diblokir di browser. Buka setelan izin situs browser Anda untuk mengizinkan notifikasi."}
              {pushState === "inactive" && "Aktifkan agar pengingat harian tetap muncul di layar perangkat saat aplikasi tertutup."}
              {pushState === "subscribed" && "Perangkat ini sudah terdaftar. Pengingat belajar akan muncul sebagai notifikasi pop-up sistem."}
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

        <div className={styles.row}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Uji Notifikasi di Luar Aplikasi</span>
            <span className={styles.rowHint}>
              Kirim notifikasi percobaan untuk memastikan pop-up sistem muncul di HP / komputer Anda.
            </span>
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleTestPush()}
            disabled={testing || pushState === "denied"}
          >
            {testing ? "Mengirim…" : "🔔 Kirim Tes Notifikasi"}
          </Button>
        </div>

        {pushMessage && (
          <p className={`${styles.status} ${pushMessage.kind === "ok" ? styles.statusOk : styles.statusError}`} role="status">
            {pushMessage.text}
          </p>
        )}
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
            role="switch"
            className={styles.switch}
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

            <label className={styles.row}>
              <span className={styles.rowText}>
                <span className={styles.rowLabel}>Jam Tenang (Quiet Hours)</span>
                <span className={styles.rowHint}>
                  Tahan pengingat rutin pada jam tidur Anda (peringatan darurat streak tetap menembus jika ≤3 jam sebelum tengah malam).
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={Boolean(form.quietHourStart && form.quietHourEnd)}
                onChange={(event) =>
                  update(
                    event.target.checked
                      ? { quietHourStart: "22:00", quietHourEnd: "07:00" }
                      : { quietHourStart: null, quietHourEnd: null },
                  )
                }
              />
            </label>

            {form.quietHourStart && form.quietHourEnd && (
              <div className={styles.quietGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="quietHourStart">
                    Mulai jam tenang
                  </label>
                  <input
                    id="quietHourStart"
                    type="time"
                    className={styles.input}
                    value={form.quietHourStart}
                    onChange={(event) => update({ quietHourStart: event.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="quietHourEnd">
                    Selesai jam tenang
                  </label>
                  <input
                    id="quietHourEnd"
                    type="time"
                    className={styles.input}
                    value={form.quietHourEnd}
                    onChange={(event) => update({ quietHourEnd: event.target.value })}
                  />
                </div>
              </div>
            )}

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
