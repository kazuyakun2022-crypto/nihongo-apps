"use client";

import { useEffect, useRef, useState } from "react";
import { apiUpload } from "@/core/http/apiClient";
import { useModalBehavior } from "@/shared/ui/useModalBehavior";
import {
  CloseIcon,
  CropIcon,
  RotateCwIcon,
  ZoomInIcon,
  ZoomOutIcon,
  CheckIcon,
} from "@/shared/ui/icons";
import styles from "./bannerCropModal.module.css";

interface BannerCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (uploadedUrl: string) => void;
}

const RATIO_OPTIONS = [
  { label: "2.4 : 1 (Ideal Beranda 1200×500)", value: 2.4, targetH: 500 },
  { label: "16 : 9 (Landscape 1200×675)", value: 16 / 9, targetH: 675 },
  { label: "2 : 1 (Ultra-Wide 1200×600)", value: 2.0, targetH: 600 },
];

export function BannerCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: BannerCropModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [ratio, setRatio] = useState<number>(2.4);
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dragging refs
  const isDraggingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useModalBehavior(dialogRef as React.RefObject<HTMLElement>, onClose, isUploading, isOpen);

  // Reset transforms saat modal atau gambar berganti
  useEffect(() => {
    if (isOpen && imageSrc) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setRatio(2.4);
      setError(null);
      setImgLoaded(false);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const isRotated90or270 = rotation === 90 || rotation === 270;

  // Hitung base cover scale saat gambar berhasil dimuat
  const getCoverScale = () => {
    if (!viewportRef.current || !imgRef.current) return 1;
    const vp = viewportRef.current.getBoundingClientRect();
    const nw = imgRef.current.naturalWidth || 1;
    const nh = imgRef.current.naturalHeight || 1;
    const effW = isRotated90or270 ? nh : nw;
    const effH = isRotated90or270 ? nw : nh;
    return Math.max(vp.width / effW, vp.height / effH);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isUploading) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    startPosRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || isUploading) return;
    setPan({
      x: e.clientX - startPosRef.current.x,
      y: e.clientY - startPosRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Abaikan jika pointer capture sudah lepas
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isUploading) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((prev) => Math.min(3.5, Math.max(0.6, Number((prev + delta).toFixed(2)))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleResetCenter = () => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  const handleCropAndUpload = async () => {
    if (!imgRef.current || !viewportRef.current) return;
    setIsUploading(true);
    setError(null);

    try {
      const img = imgRef.current;
      const vp = viewportRef.current.getBoundingClientRect();
      const outputW = 1200;
      const targetOpt = RATIO_OPTIONS.find((r) => Math.abs(r.value - ratio) < 0.05) || RATIO_OPTIONS[0];
      const outputH = targetOpt.targetH;

      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Browser tidak mendukung render Canvas.");

      // Aktifkan smoothing kualitas tinggi
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const effW = isRotated90or270 ? nh : nw;
      const effH = isRotated90or270 ? nw : nh;

      const coverScale = Math.max(vp.width / effW, vp.height / effH);
      const totalScale = coverScale * scale;

      const mult = outputW / vp.width;

      const canvasCenterX = outputW / 2;
      const canvasCenterY = outputH / 2;
      const canvasPanX = pan.x * mult;
      const canvasPanY = pan.y * mult;

      const drawnW = nw * totalScale * mult;
      const drawnH = nh * totalScale * mult;

      ctx.save();
      ctx.translate(canvasCenterX + canvasPanX, canvasCenterY + canvasPanY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawnW / 2, -drawnH / 2, drawnW, drawnH);
      ctx.restore();

      // Kompres ke WebP (dengan fallback JPEG)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", 0.9);
      }) || await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) throw new Error("Gagal membuat berkas gambar hasil crop.");

      // Upload via backend endpoint /api/admin/media
      const res = await apiUpload<{ id: string; url: string }>("/admin/media", blob);
      onCropComplete(res.url);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Gagal mengunggah gambar hasil crop.");
    } finally {
      setIsUploading(false);
    }
  };

  // Base scale kalkulasi untuk tampilan CSS img di viewport
  const vpRect = viewportRef.current?.getBoundingClientRect();
  const baseScale = vpRect && imgRef.current ? getCoverScale() : 1;
  const currentTotalScale = baseScale * scale;

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-crop-modal-title"
      >
        {/* Header Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon} aria-hidden="true">
              <CropIcon size={20} />
            </div>
            <div>
              <h2 id="banner-crop-modal-title" className={styles.titleText}>
                Potong &amp; Pas-kan Gambar Banner (Crop &amp; Fit)
              </h2>
              <p className={styles.subtitleText}>
                Geser (drag) dan perbesar (zoom) agar foto pas dengan rasio banner beranda.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isUploading}
            aria-label="Tutup modal crop"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Work Area */}
        <div className={styles.modalBody}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Viewport Box */}
          <div
            ref={viewportRef}
            className={styles.viewportContainer}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ aspectRatio: String(ratio) }}
          >
            <span className={styles.dragHint}>🖱️ Geser untuk mengatur posisi foto</span>

            {/* Gambar yang digerakkan */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Gambar sumber crop"
              className={styles.cropImage}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${currentTotalScale}) rotate(${rotation}deg)`,
                opacity: imgLoaded ? 1 : 0,
                transition: isDraggingRef.current ? "none" : "transform 0.08s ease-out",
              }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setError("Gagal memuat gambar sumber. Pastikan berkas gambar valid.")}
            />

            {/* Grid 3x3 Overlay */}
            <div className={styles.gridOverlay}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={styles.gridCell} />
              ))}
            </div>

            {/* Safe Zone Visual Guide */}
            <div className={styles.safeZoneGuide}>
              <div className={styles.safeZoneText}>
                <span className={styles.safeZoneTextBadge}>Zona Teks &amp; Tombol</span>
              </div>
              <div className={styles.safeZoneFocus}>
                <span className={styles.safeZoneFocusBadge}>Fokus Foto / Objek</span>
              </div>
            </div>
          </div>

          {/* Toolbar Pengontrol */}
          <div className={styles.toolbar}>
            {/* Pilihan Rasio */}
            <div className={styles.ratioRow}>
              <span className={styles.ratioLabel}>Pilihan Rasio Banner:</span>
              <div className={styles.ratioChips}>
                {RATIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.ratioBtn} ${Math.abs(ratio - opt.value) < 0.05 ? styles.ratioBtnActive : ""}`}
                    onClick={() => {
                      setRatio(opt.value);
                      setPan({ x: 0, y: 0 });
                    }}
                    disabled={isUploading}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Slider & Fit Actions */}
            <div className={styles.controlsRow}>
              <div className={styles.zoomGroup}>
                <span className={styles.zoomIcon} aria-hidden="true">
                  <ZoomOutIcon size={16} />
                </span>
                <input
                  type="range"
                  min="0.6"
                  max="3.0"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className={styles.zoomSlider}
                  aria-label="Atur tingkat zoom gambar"
                  disabled={isUploading}
                />
                <span className={styles.zoomIcon} aria-hidden="true">
                  <ZoomInIcon size={16} />
                </span>
                <span className={styles.zoomValue}>{Math.round(scale * 100)}%</span>
              </div>

              <div className={styles.actionButtons}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={handleResetCenter}
                  disabled={isUploading}
                  title="Pusatkan posisi gambar"
                >
                  Pusatkan
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={handleRotate}
                  disabled={isUploading}
                  title="Putar 90 derajat searah jarum jam"
                >
                  <RotateCwIcon size={14} /> Putar 90°
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className={styles.modalFooter}>
          <span className={styles.footerHint}>
            Gambar akan otomatis disimpan berformat <strong>WebP</strong> (1200 px) agar ringan &amp; tajam.
          </span>
          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={isUploading}
            >
              Batal
            </button>
            <button
              type="button"
              className={styles.btnApply}
              onClick={() => void handleCropAndUpload()}
              disabled={isUploading || !imgLoaded}
            >
              <CheckIcon size={16} strokeWidth={2.5} />
              {isUploading ? "Mengompres & Mengunggah..." : "✂️ Terapkan & Pasang"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

