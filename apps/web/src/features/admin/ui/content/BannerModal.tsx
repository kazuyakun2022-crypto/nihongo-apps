"use client";

import { useEffect, useRef, useState } from "react";
import type { BannerInput, BannerItem } from "@/features/banner/domain/types";
import {
  getBannerShadingStyle,
  SHADING_POSITIONS,
  SHADING_PRESETS,
  type ShadingPosition,
} from "@/features/banner/domain/shading";
import { useModalBehavior } from "@/shared/ui/useModalBehavior";
import { CloseIcon, CheckIcon, ImageIcon, ArrowRightIcon, UploadIcon, CropIcon } from "@/shared/ui/icons";
import { BannerCropModal } from "./BannerCropModal";
import styles from "./bannerManager.module.css";

export const BANNER_PRESETS = [
  {
    label: "Kuil Fushimi Inari",
    url: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Malam Kota Tokyo",
    url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Gunung Fuji & Sakura",
    url: "https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Lorong Akihabara",
    url: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Pagoda Kyoto",
    url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    label: "Ruang Belajar Sensei",
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
  },
];

const ROUTE_SUGGESTIONS = [
  { label: "Simulasi JLPT", route: "/simulasi" },
  { label: "Scanner AI", route: "/scan" },
  { label: "Voice Sensei", route: "/ngobrol" },
  { label: "Materi Belajar", route: "/belajar" },
  { label: "Review Kata", route: "/review" },
  { label: "Ujian Tahap", route: "/ujian" },
];

const BADGE_SUGGESTIONS = ["Promo", "Rekomendasi", "Fitur Baru", "Event", "Simulasi Ujian", "Tips Belajar"];

interface BannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  banner: BannerItem | null;
  defaultOrder: number;
  onSave: (payload: BannerInput) => Promise<void>;
}

export function BannerModal({
  isOpen,
  onClose,
  banner,
  defaultOrder,
  onSave,
}: BannerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [badge, setBadge] = useState("");
  const [target, setTarget] = useState<"_self" | "_blank">("_self");
  const [order, setOrder] = useState(defaultOrder);
  const [isActive, setIsActive] = useState(true);
  const [shadingPosition, setShadingPosition] = useState<ShadingPosition>("left");
  const [shadingOpacity, setShadingOpacity] = useState<number>(60);

  // Fitur Upload dari Galeri & Crop Modal
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropRawImage, setCropRawImage] = useState("");
  const [dragging, setDragging] = useState(false);

  const processFile = (file: File | undefined | null) => {
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) {
      setError("Pilih berkas gambar yang valid (JPG, PNG, WebP).");
      return;
    }
    if (cropRawImage.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(cropRawImage);
      } catch {}
    }
    const objectUrl = URL.createObjectURL(file);
    setCropRawImage(objectUrl);
    setCropModalOpen(true);
  };

  const handlePickFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = "";
    }
  };

  const handleCloseCrop = () => {
    if (cropRawImage.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(cropRawImage);
      } catch {}
    }
    setCropModalOpen(false);
  };

  const handleCropExisting = () => {
    if (imageUrl.trim()) {
      setCropRawImage(imageUrl.trim());
      setCropModalOpen(true);
    }
  };

  const handleCropCompleted = (uploadedUrl: string) => {
    if (cropRawImage.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(cropRawImage);
      } catch {}
    }
    setImageUrl(uploadedUrl);
    setCropModalOpen(false);
  };

  // Hook perilaku modal (Escape, kunci scroll hanya jika terbuka, focus trap)
  useModalBehavior(dialogRef as React.RefObject<HTMLElement>, onClose, submitting, isOpen);

  useEffect(() => {
    if (banner) {
      setTitle(banner.title);
      setDesc(banner.description || "");
      setImageUrl(banner.imageUrl);
      setLinkUrl(banner.linkUrl);
      setBadge(banner.badge || "");
      setTarget(banner.target);
      setOrder(banner.order);
      setIsActive(banner.isActive);
      setShadingPosition(banner.shadingPosition || "left");
      setShadingOpacity(banner.shadingOpacity ?? 60);
    } else {
      setTitle("");
      setDesc("");
      setImageUrl(BANNER_PRESETS[0].url);
      setLinkUrl("/simulasi");
      setBadge("Promo");
      setTarget("_self");
      setOrder(defaultOrder);
      setIsActive(true);
      setShadingPosition("left");
      setShadingOpacity(60);
    }
    setError(null);
  }, [banner, defaultOrder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul banner wajib diisi.");
      return;
    }
    if (!imageUrl.trim()) {
      setError("URL gambar banner wajib diisi.");
      return;
    }
    if (!linkUrl.trim()) {
      setError("URL tautan tujuan wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        description: desc.trim() || null,
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        badge: badge.trim() || null,
        target,
        order: Number(order) || 0,
        isActive,
        shadingPosition,
        shadingOpacity: Number(shadingOpacity) || 60,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan banner.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-modal-title"
        onPaste={(e) => {
          const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
          if (file) {
            e.preventDefault();
            processFile(file);
          }
        }}
      >
        {/* Header Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitleGroup}>
            <div className={styles.modalHeaderIcon} aria-hidden="true">
              <ImageIcon size={22} />
            </div>
            <div>
              <h2 id="banner-modal-title" className={styles.modalTitleText}>
                {banner ? "Edit Banner & Iklan" : "Pasang Banner Baru"}
              </h2>
              <p className={styles.modalSubtitleText}>
                {banner
                  ? "Perbarui teks, gambar, aturan shading, atau arah tautan iklan di Beranda siswa."
                  : "Tambahkan rekomendasi atau promosi berputar otomatis di halaman Beranda."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Form Isi & Live Preview */}
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          {/* ── LIVE PREVIEW MINI BANNER ── */}
          <div className={styles.livePreviewWrap}>
            <div className={styles.livePreviewHeader}>
              <span className={styles.livePreviewLabel}>
                Pratinjau Nyata di Beranda Siswa
              </span>
              <span style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                Shading: {shadingPosition === "right" ? "Kanan" : shadingPosition === "bottom" ? "Bawah" : shadingPosition === "full" ? "Merata" : "Kiri"} · {shadingOpacity}% ({target === "_blank" ? "Tab Baru" : "Halaman Ini"})
              </span>
            </div>

            <div className={styles.previewMiniBanner}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className={styles.previewImg}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : null}
              <div
                className={styles.previewOverlay}
                style={getBannerShadingStyle(shadingPosition, shadingOpacity)}
              />
              <span className={styles.watermarkKanji} aria-hidden="true" lang="ja">
                推
              </span>

              <div className={styles.previewContent}>
                {badge && <span className={styles.previewBadge}>{badge}</span>}
                <h3 className={styles.previewTitle}>
                  {title || "Judul Rekomendasi atau Iklan"}
                </h3>
                <p className={styles.previewDesc}>
                  {desc || "Deskripsi singkat mengenai penawaran materi, simulasi, atau fitur baru."}
                </p>
                <span className={styles.previewBtn}>
                  <span>Buka Sekarang</span>
                  <ArrowRightIcon size={12} />
                </span>
              </div>
            </div>
          </div>

          {/* ── ISIAN FORM ── */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="banner-title">
              <span>
                Judul Banner <span className={styles.requiredMark}>*</span>
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 400 }}>
                {title.length}/60 karakter
              </span>
            </label>
            <input
              id="banner-title"
              type="text"
              className={styles.formInput}
              placeholder="Misal: Simulasi JLPT Resmi 2026 atau Promo Kelas Intensif N3"
              value={title}
              maxLength={70}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="banner-desc">
              <span>Deskripsi Singkat (Opsional)</span>
            </label>
            <textarea
              id="banner-desc"
              className={styles.formTextarea}
              rows={2}
              placeholder="Jelaskan secara ringkas penawaran atau informasi yang ingin disampaikan ke siswa..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          {/* Label / Badge Penanda */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="banner-badge">
              <span>Label Penanda / Badge</span>
            </label>
            <input
              id="banner-badge"
              type="text"
              className={styles.formInput}
              placeholder="Misal: Promo, Rekomendasi, Event, Fitur Baru"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
            />
            <div className={styles.chipsRow}>
              {BADGE_SUGGESTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`${styles.chipBtn} ${badge === b ? styles.chipBtnActive : ""}`}
                  onClick={() => setBadge(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Gambar Banner & Preset Gallery */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="banner-image">
              <span>
                Gambar Latar &amp; Foto Promosi <span className={styles.requiredMark}>*</span>
              </span>
            </label>

            {/* Input Tersembunyi untuk Buka Galeri HP / File Picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelected}
            />

            {/* Area Unggah: Drag & Drop, Klik Buka Galeri, & Tempel Ctrl+V */}
            <div
              className={styles.bannerDropZone}
              data-dragging={dragging ? "true" : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              onClick={handlePickFromGallery}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePickFromGallery();
                }
              }}
              tabIndex={0}
              role="button"
              aria-label="Area seret & lepas gambar atau klik untuk pilih dari galeri"
            >
              <div className={styles.dropZoneIconWrap} aria-hidden="true">
                <UploadIcon size={22} />
              </div>

              <div className={styles.dropZoneTextGroup}>
                <span className={styles.dropZoneMainText}>
                  {dragging
                    ? "Lepaskan foto di sini untuk memotong (Crop & Fit)..."
                    : "Seret & lepas foto ke sini, atau klik untuk buka Galeri"}
                </span>
                <span className={styles.dropZoneSubText}>
                  Mendukung JPG, PNG, WebP · Tempel langsung (Ctrl+V) didukung
                </span>
              </div>

              <div className={styles.dropZoneActions}>
                <span className={styles.btnGalleryUpload}>
                  <UploadIcon size={14} />
                  <span>📁 Buka Galeri / File</span>
                </span>

                {imageUrl.trim() && (
                  <button
                    type="button"
                    className={styles.btnCropExisting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCropExisting();
                    }}
                    title="Buka alat potong & sesuaikan gambar ini"
                  >
                    <CropIcon size={14} />
                    <span>✂️ Crop &amp; Pas-kan Gambar Ini</span>
                  </button>
                )}
              </div>
            </div>

            <input
              id="banner-image"
              type="text"
              className={styles.formInput}
              placeholder="https://images.unsplash.com/... atau /api/media/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
            <div className={styles.imageDimensionTip}>
              <span className={styles.imageDimensionTitle}>📐 Panduan Ukuran & Rasio Gambar yang Pas:</span>
              <span>
                • <strong>Ukuran Rekomendasi:</strong> <code>1200 × 500 px</code> (rasio ~<code>2.4:1</code>) atau <code>1200 × 630 px</code> (rasio <code>16:9</code> landscape).<br />
                • <strong>Zona Aman Teks:</strong> Taruh objek/karakter/produk utama di <strong>sisi kanan</strong> agar tidak tertutup teks judul & tombol di sisi kiri.<br />
                • <strong>Format & Ukuran File:</strong> Format WebP atau JPG, disarankan di bawah 500 KB agar cepat dimuat di HP.
              </span>
            </div>
            <span className={styles.formHelper}>
              Pilih salah satu preset gambar bernuansa Jepang di bawah ini atau tempel URL gambar pilihanmu sendiri:
            </span>

            <div className={styles.presetGrid}>
              {BANNER_PRESETS.map((preset) => {
                const isSelected = imageUrl === preset.url;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`${styles.presetCard} ${isSelected ? styles.presetCardActive : ""}`}
                    onClick={() => setImageUrl(preset.url)}
                    title={preset.label}
                  >
                    <img src={preset.url} alt="" className={styles.presetCardImg} />
                    <span className={styles.presetCardLabel}>{preset.label}</span>
                    {isSelected && (
                      <span className={styles.presetCheckmark} aria-hidden="true">
                        <CheckIcon size={11} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ATURAN SHADING / BAYANGAN GAMBAR ── */}
          <div className={styles.shadingBox}>
            <div className={styles.shadingBoxHeader}>
              <span className={styles.shadingBoxTitle}>
                Aturan Bayangan (Shading Overlay)
              </span>
              <span className={styles.shadingPercentBadge}>
                Ketebalan: {shadingOpacity}%
              </span>
            </div>
            <p className={styles.shadingBoxDesc}>
              Sesuaikan arah bayangan dan tingkat ketebalannya agar foto latar tetap terlihat jelas dan teks terbaca nyaman.
            </p>

            {/* Pilihan Arah / Posisi Bayangan */}
            <div className={styles.formGroup} style={{ marginBottom: 10 }}>
              <label className={styles.formLabel}>
                <span>Posisi / Arah Bayangan Gelap</span>
              </label>
              <div className={styles.shadingPosGrid}>
                {SHADING_POSITIONS.map((pos) => {
                  const isSelected = shadingPosition === pos.value;
                  return (
                    <button
                      key={pos.value}
                      type="button"
                      className={`${styles.shadingPosBtn} ${isSelected ? styles.shadingPosBtnActive : ""}`}
                      onClick={() => setShadingPosition(pos.value)}
                    >
                      <span className={styles.shadingPosIcon} aria-hidden="true">{pos.icon}</span>
                      <span className={styles.shadingPosLabel}>{pos.label}</span>
                      <span className={styles.shadingPosDesc}>{pos.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Ketebalan / Opasitas Bayangan */}
            <div className={styles.formGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                  <span>Ketebalan / Kepekatan Bayangan</span>
                </label>
                <div className={styles.shadingPresetsGroup}>
                  {SHADING_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className={`${styles.shadingPresetBtn} ${shadingOpacity === p.value ? styles.shadingPresetBtnActive : ""}`}
                      onClick={() => setShadingOpacity(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.shadingSliderRow}>
                <span style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>10% (Tipis)</span>
                <input
                  type="range"
                  min="10"
                  max="95"
                  step="5"
                  value={shadingOpacity}
                  onChange={(e) => setShadingOpacity(Number(e.target.value))}
                  className={styles.shadingSlider}
                />
                <span style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>95% (Pekat)</span>
              </div>
            </div>
          </div>

          {/* Tautan Tujuan & Quick Route Chips */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="banner-link">
              <span>
                Tautan Aksi Klik <span className={styles.requiredMark}>*</span>
              </span>
            </label>
            <input
              id="banner-link"
              type="text"
              className={styles.formInput}
              placeholder="Misal: /simulasi atau https://contoh-iklan.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
            <div className={styles.chipsRow}>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", alignSelf: "center" }}>
                Rute Cepat:
              </span>
              {ROUTE_SUGGESTIONS.map((r) => (
                <button
                  key={r.route}
                  type="button"
                  className={`${styles.chipBtn} ${linkUrl === r.route ? styles.chipBtnActive : ""}`}
                  onClick={() => {
                    setLinkUrl(r.route);
                    setTarget("_self");
                  }}
                >
                  {r.label} ({r.route})
                </button>
              ))}
            </div>
            <span className={styles.formHelper}>
              Kamu bisa mengarahkan ke rute dalam aplikasi (seperti <code>/simulasi</code>, <code>/scan</code>) atau link eksternal web lain (seperti <code>https://...</code>).
            </span>
          </div>

          {/* Target Jendela & Urutan Tampilan */}
          <div className={styles.formRow2Col}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="banner-target">
                <span>Target Jendela</span>
              </label>
              <select
                id="banner-target"
                className={styles.formSelect}
                value={target}
                onChange={(e) => setTarget(e.target.value as "_self" | "_blank")}
              >
                <option value="_self">Halaman Ini (_self)</option>
                <option value="_blank">Buka Tab Baru (_blank)</option>
              </select>
              <span className={styles.formHelper}>
                Tab baru disarankan untuk tautan eksternal.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="banner-order">
                <span>Urutan Rotasi</span>
              </label>
              <input
                id="banner-order"
                type="number"
                min={0}
                className={styles.formInput}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
              <span className={styles.formHelper}>
                Angka lebih kecil akan berputar lebih awal.
              </span>
            </div>
          </div>

          {/* Status Aktif Langsung */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: isActive ? "#f0fdf4" : "var(--palette-washi)",
              border: "1.5px solid",
              borderColor: isActive ? "#bbf7d0" : "var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.85rem", color: isActive ? "#15803d" : "var(--color-text)" }}>
                {isActive ? "Status: Aktif di Beranda" : "Status: Disimpan sebagai Draft"}
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
                {isActive
                  ? "Siswa dapat langsung melihat banner ini berputar di Beranda."
                  : "Banner disembunyikan dan tidak akan muncul di Beranda siswa."}
              </div>
            </div>

            <label className={styles.switchWrap} aria-label="Toggle status banner">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ display: "none" }}
              />
              <div className={`${styles.switchTrack} ${isActive ? styles.switchTrackActive : ""}`}>
                <div className={`${styles.switchThumb} ${isActive ? styles.switchThumbActive : ""}`} />
              </div>
            </label>
          </div>

          {/* Footer Modal */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submitting}
            >
              {submitting
                ? "Menyimpan…"
                : banner
                ? "Simpan Perubahan"
                : "Pasang Banner Sekarang"}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Crop & Fit Interaktif */}
      <BannerCropModal
        isOpen={cropModalOpen}
        imageSrc={cropRawImage}
        onClose={handleCloseCrop}
        onCropComplete={handleCropCompleted}
      />
    </div>
  );
}
