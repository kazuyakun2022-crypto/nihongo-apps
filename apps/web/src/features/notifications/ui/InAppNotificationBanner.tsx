"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "../application/NotificationsProvider";
import styles from "./inAppBanner.module.css";

export function InAppNotificationBanner() {
  const { toast, dismissToast } = useNotifications();
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      dismissToast();
    }, 5500);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [toast, dismissToast]);

  if (!toast) return null;

  const handleClick = () => {
    const target = toast.url || "/notifikasi";
    dismissToast();
    router.push(target);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissToast();
  };

  return (
    <div className={styles.toastWrapper} role="alert" aria-live="polite">
      <div className={styles.toastCard} onClick={handleClick}>
        <div className={styles.sealIcon} aria-hidden="true">
          <span className={styles.sealKana} lang="ja">日</span>
        </div>

        <div className={styles.toastBody}>
          <div className={styles.toastMeta}>
            <span>Nihongo PWA</span>
            <span className={styles.toastTime}>Baru saja</span>
          </div>

          <h4 className={styles.toastTitle}>{toast.title}</h4>
          <p className={styles.toastText}>{toast.body}</p>

          <div className={styles.toastActionRow}>
            <span className={styles.toastActionText}>Buka sekarang →</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Tutup notifikasi"
          title="Tutup"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
