"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BellIcon, SettingsIcon } from "@/shared/ui/icons";
import { useNotifications } from "../application/NotificationsProvider";
import { notificationTime, TYPE_META } from "./meta";
import styles from "./notification.module.css";

export function NotificationBell({ inline = false }: { inline?: boolean }) {
  const { items, unreadCount, markAllRead, markRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refresh]);

  const latest = items.slice(0, 5);

  return (
    <div ref={rootRef} className={`${styles.bellWrapper} ${inline ? styles.rootInline : ""}`}>
      <button
        type="button"
        className={`${styles.bell} ${inline ? styles.bellInline : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifikasi"
      >
        <BellIcon size={20} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <div className={`${styles.panel} ${inline ? styles.panelInline : ""}`} role="dialog" aria-label="Notifikasi terbaru">
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Notifikasi</h2>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                className={styles.textBtn}
                onClick={() => void markAllRead()}
                disabled={unreadCount === 0}
              >
                Tandai dibaca
              </button>
              <Link
                href="/profil/notifikasi"
                className={styles.textBtn}
                aria-label="Pengaturan notifikasi"
                title="Pengaturan notifikasi"
                onClick={() => setOpen(false)}
                style={{ display: "inline-flex", alignItems: "center", padding: "4px" }}
              >
                <SettingsIcon size={16} />
              </Link>
            </div>
          </div>

          {latest.length === 0 ? (
            <p className={styles.empty}>Belum ada notifikasi. Yuk mulai belajar hari ini.</p>
          ) : (
            <ul className={styles.list}>
              {latest.map((item) => {
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
          )}

          <Link href="/notifikasi" className={styles.footer}>
            Lihat semua notifikasi
          </Link>
        </div>
      )}
    </div>
  );
}
