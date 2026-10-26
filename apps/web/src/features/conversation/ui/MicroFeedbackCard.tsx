"use client";

import { useState } from "react";
import type { Correction } from "../domain/types";
import { ArrowRightIcon, PawIcon, SparklesIcon } from "@/shared/ui/icons";
import styles from "./chat.module.css";

interface MicroFeedbackCardProps {
  correction: Correction;
}

/**
 * Kartu Koreksi Mikro Non-Disruptif sesuai PRD.
 * Menampilkan catatan perbaikan tata bahasa/partikel dari Neko-sensei
 * tanpa mengganggu atau memutus alur percakapan obrolan utama.
 */
export function MicroFeedbackCard({ correction }: MicroFeedbackCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.microFeedbackCard} role="region" aria-label="Catatan Koreksi Neko-sensei">
      <button
        type="button"
        className={styles.feedbackToggleBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className={styles.feedbackBadge}>
          <PawIcon size={14} className={styles.feedbackPawIcon} />
          <span>Catatan Sensei</span>
        </span>
        <span className={styles.feedbackSummaryText}>
          {isOpen ? "Tutup Catatan" : "Lihat Catatan Tata Bahasa"}
        </span>
        <span className={`${styles.feedbackChevron} ${isOpen ? styles.feedbackChevronOpen : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className={styles.feedbackBody}>
          <div className={styles.feedbackComparison}>
            <div className={styles.mistakeBlock}>
              <span className={styles.blockLabel}>Kalimatmu:</span>
              <s lang="ja" className={styles.userOriginalText}>
                {correction.original}
              </s>
            </div>

            <span className={styles.diffArrow} aria-hidden="true">
              <ArrowRightIcon size={14} />
            </span>

            <div className={styles.correctedBlock}>
              <span className={styles.blockLabel}>Bentuk Alami:</span>
              <strong lang="ja" className={styles.correctedText}>
                <SparklesIcon size={13} className={styles.sparkleIcon} />
                {correction.corrected}
              </strong>
            </div>
          </div>

          {correction.explanation && (
            <div className={styles.explanationBox}>
              <p className={styles.explanationText}>{correction.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
