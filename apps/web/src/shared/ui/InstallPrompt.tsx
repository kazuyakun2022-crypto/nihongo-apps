"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { CloseIcon } from "./icons";
import styles from "./pwa.module.css";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Dialog Popup "Pasang aplikasi" (PWA install prompt).
 * Tampil sebagai modal popup melayang di atas layar, bukan bagian dari alur konten halaman.
 * Android/desktop memakai beforeinstallprompt; iPhone menampilkan petunjuk menu Bagikan.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone;
    if (standalone) return;

    setDismissed(sessionStorage.getItem("install-dismissed") === "1");
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIos) setShowIosHint(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Tangani tombol Escape untuk menutup popup
  useEffect(() => {
    if (dismissed || (!deferred && !showIosHint)) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissed, deferred, showIosHint]);

  if (dismissed || (!deferred && !showIosHint) || typeof document === "undefined") {
    return null;
  }

  const close = () => {
    sessionStorage.setItem("install-dismissed", "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        sessionStorage.setItem("install-dismissed", "1");
        setDismissed(true);
      }
    } catch {
      // Abaikan jika browser membatalkan prompt
    } finally {
      setDeferred(null);
    }
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
      aria-describedby="install-desc"
    >
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={close}
          aria-label="Tutup"
          title="Tutup"
        >
          <CloseIcon size={18} />
        </button>

        <div className={styles.iconWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt="Logo Nihongo"
            className={styles.appIcon}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>

        <h3 id="install-title" className={styles.title}>
          Pasang Aplikasi
        </h3>

        <p id="install-desc" className={styles.text}>
          {deferred
            ? "Pasang aplikasi di layar utama agar bisa dibuka seperti aplikasi biasa dan menerima pengingat belajar."
            : "Di iPhone, ketuk tombol Bagikan lalu pilih “Tambahkan ke Layar Utama” agar pengingat belajar bisa muncul."}
        </p>

        <div className={styles.actions}>
          {deferred && (
            <Button block onClick={handleInstall}>
              Pasang aplikasi
            </Button>
          )}
          <Button block variant="ghost" onClick={close}>
            Nanti saja
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
