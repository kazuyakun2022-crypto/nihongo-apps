"use client";

import { useEffect, useState } from "react";
import { ASSET_BASE, POSES } from "./neko/nekoRig";
import { Button } from "./Button";
import styles from "./confirmModal.module.css";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary" | "secondary";
  iconType?: "warning" | "logout" | "info";
  busy?: boolean;
  /** Ucapan Miu-chan di gelembung percakapan (hanya untuk ikon logout). */
  speech?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  confirmVariant = "danger",
  iconType = "warning",
  busy = false,
  speech = "Ne, ika naide… sabishiku naru yo.",
}: ConfirmModalProps) {
  const isLogout = iconType === "logout";
  const [typedSpeech, setTypedSpeech] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, busy, onClose]);

  // Ucapan muncul bertahap seperti sedang mengetik (langsung penuh saat reduced motion).
  useEffect(() => {
    if (!isOpen || !isLogout) {
      setTypedSpeech("");
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced) {
      setTypedSpeech(speech);
      return;
    }
    setTypedSpeech("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedSpeech(speech.slice(0, index));
      if (index >= speech.length) window.clearInterval(timer);
    }, 38);
    return () => window.clearInterval(timer);
  }, [isOpen, isLogout, speech]);

  if (!isOpen) return null;

  const iconClass = iconType === "info" ? styles.iconInfo : styles.iconWarning;
  const iconSymbol = iconType === "info" ? "ℹ️" : "⚠️";

  return (
    <div
      className={styles.backdrop}
      onClick={() => {
        if (!busy) onClose();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.header} ${isLogout ? styles.headerCentered : ""}`}>
          {isLogout ? (
            <div className={styles.mascotScene}>
              <p className={styles.speechBubble}>
                {typedSpeech}
                {typedSpeech.length < speech.length && (
                  <span className={styles.caret} aria-hidden="true" />
                )}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.mascot}
                src={ASSET_BASE + POSES.nangis.still}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </div>
          ) : (
            <div className={`${styles.iconWrap} ${iconClass}`}>{iconSymbol}</div>
          )}
          <div className={styles.titleGroup}>
            <h3 id="confirm-modal-title" className={styles.title}>
              {title}
            </h3>
          </div>
        </div>

        <div className={`${styles.body} ${isLogout ? styles.bodyCentered : ""}`}>
          <p id="confirm-modal-desc" className={styles.description}>
            {description}
          </p>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" type="button" disabled={busy} onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Memproses…" : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
