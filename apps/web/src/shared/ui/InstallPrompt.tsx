"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import styles from "./pwa.module.css";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Tombol "Pasang aplikasi" (dokumen: Catatan PWA).
 * Android/desktop memakai beforeinstallprompt; iPhone hanya bisa lewat menu Bagikan, jadi kita tampilkan panduan.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
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

  if (dismissed || (!deferred && !showIosHint)) return null;

  const close = () => {
    sessionStorage.setItem("install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <aside className={styles.banner}>
      <p className={styles.text}>
        {deferred
          ? "Pasang aplikasi di layar utama agar bisa dibuka seperti aplikasi biasa dan menerima pengingat belajar."
          : "Di iPhone, ketuk tombol Bagikan lalu pilih \u201CTambahkan ke Layar Utama\u201D agar pengingat belajar bisa muncul."}
      </p>
      <div className={styles.actions}>
        {deferred && (
          <Button
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
            }}
          >
            Pasang aplikasi
          </Button>
        )}
        <Button variant="ghost" onClick={close}>
          Nanti saja
        </Button>
      </div>
    </aside>
  );
}
