"use client";

import Link from "next/link";
import { useNotifications } from "@/features/notifications/application/NotificationsProvider";
import { notificationTime, TYPE_META } from "@/features/notifications/ui/meta";
import styles from "@/features/notifications/ui/notification.module.css";
import { Button } from "@/shared/ui/Button";

export default function NotifikasiPage() {
  const { items, unreadCount, loading, error, markRead, markAllRead, refresh } = useNotifications();

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <span className={styles.count}>
          {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
        </span>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Memuat…" : "Muat ulang"}
          </Button>
          <Button type="button" variant="primary" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
            Tandai semua dibaca
          </Button>
        </div>
      </div>

      {error && <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>}

      {!loading && items.length === 0 && !error && (
        <p className={styles.empty}>Belum ada notifikasi. Mulai satu latihan hari ini, nanti pengingat akan muncul di sini.</p>
      )}

      <ul className={styles.list}>
        {items.map((item) => {
          const meta = TYPE_META[item.type];
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
    </div>
  );
}
