"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useNotifications } from "@/features/notifications/application/NotificationsProvider";
import { isIosWithoutStandalone } from "@/features/notifications/application/pushSubscription";
import {
  notificationCategory,
  notificationDayGroup,
  notificationTime,
  TYPE_META,
  type NotificationCategoryTab,
} from "@/features/notifications/ui/meta";
import styles from "@/features/notifications/ui/notification.module.css";
import { Button } from "@/shared/ui/Button";

const TABS: { key: NotificationCategoryTab; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "srs", label: "SRS & Belajar" },
  { key: "exam", label: "Ujian & Lencana" },
  { key: "system", label: "Sistem" },
];

const GROUP_ORDER: ("Hari Ini" | "Kemarin" | "Sebelumnya")[] = ["Hari Ini", "Kemarin", "Sebelumnya"];

export default function NotifikasiPage() {
  const { items, unreadCount, loading, error, pushState, pushServerEnabled, enablePush, markRead, markAllRead, refresh } =
    useNotifications();
  const [enabling, setEnabling] = useState(false);
  const [pushBannerMsg, setPushBannerMsg] = useState<string | null>(null);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategoryTab>("all");

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((item) => notificationCategory(item.type) === activeTab);
  }, [items, activeTab]);

  const groupedItems = useMemo(() => {
    const groups = new Map<"Hari Ini" | "Kemarin" | "Sebelumnya", typeof items>();
    for (const item of filteredItems) {
      const g = notificationDayGroup(item.createdAt);
      const list = groups.get(g) ?? [];
      list.push(item);
      groups.set(g, list);
    }
    return GROUP_ORDER.filter((g) => groups.has(g)).map((label) => ({
      label,
      rows: groups.get(label)!,
    }));
  }, [filteredItems]);

  useEffect(() => {
    setIosNeedsInstall(isIosWithoutStandalone());
  }, []);

  const handleEnablePush = async () => {
    setEnabling(true);
    setPushBannerMsg(null);
    try {
      await enablePush();
      setPushBannerMsg("Notifikasi perangkat aktif! Pengingat kini muncul di layar HP/komputer meski aplikasi ditutup.");
    } catch (err) {
      setPushBannerMsg(err instanceof Error ? err.message : "Gagal mengaktifkan notifikasi perangkat.");
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <span className={styles.count}>
          {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
        </span>
        <div className={styles.actions}>
          <Link href="/profil/notifikasi" style={{ alignSelf: "center", fontSize: "0.85rem", fontWeight: 700 }}>
            Pengaturan
          </Link>
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Memuat…" : "Muat ulang"}
          </Button>
          <Button type="button" variant="primary" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
            Tandai semua dibaca
          </Button>
        </div>
      </div>

      {pushServerEnabled && pushState === "inactive" && (
        <section className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowLabel}>🔔 Aktifkan Notifikasi di Layar Perangkat</span>
              <span className={styles.rowHint}>
                Terima pengingat belajar dan peringatan streak langsung di layar notifikasi HP atau komputer meski aplikasi sedang ditutup.
              </span>
            </span>
            <Button type="button" variant="primary" onClick={() => void handleEnablePush()} disabled={enabling}>
              {enabling ? "Mengaktifkan…" : "Aktifkan"}
            </Button>
          </div>
        </section>
      )}

      {iosNeedsInstall && pushState === "unsupported" && (
        <p className={styles.notice}>
          <strong>Khusus iPhone / iPad:</strong> Untuk menampilkan notifikasi di luar aplikasi, ketuk{" "}
          <strong>Bagikan → Tambahkan ke Layar Utama</strong>, lalu aktifkan notifikasi di{" "}
          <Link href="/profil/notifikasi">Pengaturan Notifikasi</Link>.
        </p>
      )}

      {pushBannerMsg && <p className={styles.notice}>{pushBannerMsg}</p>}

      {error && <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>}

      {items.length > 0 && (
        <div className={styles.tabsRow} role="tablist" aria-label="Kategori notifikasi">
          {TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? items.length
                : items.filter((item) => notificationCategory(item.type) === tab.key).length;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`${styles.tabBtn} ${active ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {count > 0 && <span className={styles.tabCount}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {!loading && filteredItems.length === 0 && !error && (
        <p className={styles.empty}>
          {items.length === 0
            ? "Belum ada notifikasi. Mulai satu latihan hari ini, nanti pengingat akan muncul di sini."
            : "Belum ada notifikasi pada kategori ini."}
        </p>
      )}

      {groupedItems.map((group) => (
        <section key={group.label} className={styles.groupSection} aria-label={group.label}>
          <h3 className={styles.groupHeader}>{group.label}</h3>
          <ul className={styles.list}>
            {group.rows.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.system;
              return (
                <li key={item.id}>
                  <Link
                    href={item.url ?? "/notifikasi"}
                    className={`${styles.entry} ${item.readAt ? "" : styles.entryUnread}`}
                    onClick={() => void markRead(item.id)}
                  >
                    <span className={styles.seal} aria-hidden="true" lang="ja">
                      {meta.seal}
                    </span>
                    <span className={styles.entryBody}>
                      <span className={styles.entryTitle}>{item.title}</span>
                      <span className={styles.entryText}>{item.body}</span>
                      <span className={styles.entryMeta}>
                        <span className={styles.typeLabel}>{meta.label}</span>
                        <time dateTime={item.createdAt}>{notificationTime(item.createdAt)}</time>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
