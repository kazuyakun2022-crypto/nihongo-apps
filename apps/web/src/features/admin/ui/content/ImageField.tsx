"use client";

import { useRef, useState } from "react";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import { apiUpload } from "@/core/http/apiClient";
import styles from "./content.module.css";

const MAX_EDGE = 1280;
const TARGET_BYTES = 350 * 1024;

/** Perkecil & ubah ke WebP di browser agar database tidak terbebani gambar mentah dari kamera/HP. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  let quality = 0.86;
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) break;
    if (blob.size <= TARGET_BYTES || attempt === 5) {
      bitmap.close();
      return blob;
    }
    if (quality > 0.66) quality -= 0.1;
    else scale *= 0.8;
  }
  bitmap.close();
  throw new Error("Gambar tidak bisa diproses browser ini.");
}

/** Isian gambar: pilih, seret, atau tempel (Ctrl+V) gambar; nilainya alamat /api/media/… */
export function ImageField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setError("Pilih berkas gambar (JPG, PNG, WebP, atau GIF).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await compress(file);
      const res = await apiUpload<{ url: string }>("/admin/media", blob);
      onChange(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${styles.field} ${styles.fieldWide}`}>
      <label htmlFor={id} className={adminStyles.fieldLabel}>
        {label}
      </label>
      <div
        className={styles.imageDrop}
        data-dragging={dragging || undefined}
        data-filled={value ? true : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files[0]);
        }}
        onPaste={(e) => {
          const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
          if (file) {
            e.preventDefault();
            void upload(file);
          }
        }}
        tabIndex={0}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={styles.imagePreview} />
        ) : (
          <span className={styles.imagePlaceholder} aria-hidden="true">
            🖼️
          </span>
        )}
        <div className={styles.imageActions}>
          <span className={styles.hint}>{busy ? "Mengompres & mengunggah…" : value ? "Gambar terpasang." : "Seret gambar ke sini, tempel (Ctrl+V), atau"}</span>
          <div className={styles.imageButtons}>
            <button type="button" className={styles.btnSmall} onClick={() => inputRef.current?.click()} disabled={busy}>
              {value ? "Ganti gambar" : "Pilih gambar"}
            </button>
            {value && (
              <button type="button" className={`${styles.btnSmall} ${styles.btnSmallDanger}`} onClick={() => onChange(null)} disabled={busy}>
                Hapus
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <span className={`${styles.hint} ${styles.hintError}`}>{error}</span> : hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
