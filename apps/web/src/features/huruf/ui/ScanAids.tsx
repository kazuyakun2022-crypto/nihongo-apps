"use client";

import type { CheckedPhoto } from "./TulisHasil";
import styles from "./sheetScanner.module.css";
import { AlertIcon, CameraIcon, CheckIcon, SmartphoneIcon } from "@/shared/ui/icons";

/** Indikator di atas kamera: HP sejajar kertas (bila sensor tersedia) dan masalah cahaya/fokus saat ini. */
export function ScanAids({ tilt, problems }: { tilt: { supported: boolean; level: boolean | null }; problems: string[] }) {
  if (!tilt.supported && !problems.length) return null;
  return (
    <div className={styles.aids} aria-live="polite">
      {tilt.supported && tilt.level !== null && (
        <span className={styles.aid} data-ok={tilt.level || undefined}>
          {tilt.level ? (
            <>
              <CheckIcon size={13} strokeWidth={3} /> HP sejajar kertas
            </>
          ) : (
            <>
              <SmartphoneIcon size={13} /> Sejajarkan HP dengan kertas
            </>
          )}
        </span>
      )}
      {problems.slice(0, 1).map((p) => (
        <span key={p} className={styles.aid}>
          <AlertIcon size={13} /> {p}
        </span>
      ))}
    </div>
  );
}

/** Foto yang kurang baik: tampilkan masalahnya, siswa memilih foto ulang atau tetap memeriksa. */
export function QualityReview({ photo, problems, onRetake, onContinue }: { photo: CheckedPhoto; problems: string[]; onRetake: () => void; onContinue: () => void }) {
  return (
    <div className={styles.mismatch} role="alert">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt="Foto yang diambil" className={styles.mismatchPhoto} />
      <div className={styles.mismatchBody}>
        <p className={styles.mismatchTitle}>Fotonya kurang jelas</p>
        <ul className={styles.qualityList}>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p>Foto yang jelas membuat penilaian Miu-chan lebih tepat.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={onRetake}>
            <CameraIcon size={18} /> Foto ulang
          </button>
          <button type="button" className={styles.btnGhost} onClick={onContinue}>
            Tetap periksa
          </button>
        </div>
      </div>
    </div>
  );
}
