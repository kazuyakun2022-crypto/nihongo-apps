"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mascot } from "@/shared/ui/Mascot";
import { useNotifications } from "../application/NotificationsProvider";
import styles from "./inAppBanner.module.css";

export function InAppNotificationBanner() {
  const { toast, dismissToast } = useNotifications();
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    setDragY(0);
    if (!toast) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      dismissToast();
    }, 4500);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [toast, dismissToast]);

  if (!toast) return null;

  const handleClick = () => {
    if (dragY < -10) return;
    const target = toast.url || "/notifikasi";
    dismissToast();
    router.push(target);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissToast();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = (e.touches[0]?.clientY ?? startYRef.current) - startYRef.current;
    if (dy < 0) setDragY(dy);
  };

  const onTouchEnd = () => {
    if (dragY <= -36) {
      dismissToast();
    } else {
      setDragY(0);
    }
    startYRef.current = null;
  };

  return (
    <div className={styles.toastWrapper} role="alert" aria-live="polite">
      <div
        className={styles.toastCard}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={
          dragY < 0
            ? { transform: `translateY(${dragY}px)`, opacity: Math.max(0.25, 1 + dragY / 100) }
            : undefined
        }
      >
        <div className={styles.mascotWrap} aria-hidden="true">
          <Mascot mood="senang" size={40} title="" />
        </div>

        <div className={styles.toastBody}>
          <div className={styles.toastMeta}>
            <span>Nihongo · Miu-chan</span>
            <span className={styles.toastTime}>Baru saja</span>
          </div>

          <h4 className={styles.toastTitle}>{toast.title}</h4>
          <p className={styles.toastText}>{toast.body}</p>

          <div className={styles.toastActionRow}>
            <span className={styles.toastActionText}>Lihat Sekarang →</span>
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
