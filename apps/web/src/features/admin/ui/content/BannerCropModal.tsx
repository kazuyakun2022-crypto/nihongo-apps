"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImgRef = useRef<HTMLImageElement | null>(null);

  const [ratio, setRatio] = useState<number>(2.4);
  const [scale, setScale] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dragging refs
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialPanX: number;
    initialPanY: number;
  }>({ clientX: 0, clientY: 0, initialPanX: 0, initialPanY: 0 });

  useModalBehavior(dialogRef as React.RefObject<HTMLElement>, onClose, isUploading, isOpen);

  // Render gambar ke canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = loadedImgRef.current;
    if (!canvas || !img || status !== "ready") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetW = 1200;
    const targetOpt = RATIO_OPTIONS.find((r) => Math.abs(r.value - ratio) < 0.05) || RATIO_OPTIONS[0];
    const targetH = targetOpt.targetH;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Bersihkan & gambar latar gelap dasar
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.fillStyle = "#110709";
    ctx.fillRect(0, 0, targetW, targetH);

    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const isRotated = rotation === 90 || rotation === 270;
    const effW = isRotated ? nh : nw;
    const effH = isRotated ? nw : nh;

    // Jika mode "contain" (pas-kan utuh):
    // Buat latar belakang bernuansa lembut dengan efek blur dari foto itu sendiri
    if (fitMode === "contain") {
      ctx.save();
      ctx.filter = "blur(20px) brightness(0.42)";
      const bgScale = Math.max(targetW / effW, targetH / effH);
      const bgW = nw * bgScale;
      const bgH = nh * bgScale;
      ctx.drawImage(img, (targetW - bgW) / 2, (targetH - bgH) / 2, bgW, bgH);
      ctx.restore();
    }

    // Hitung faktor perbesaran:
    // - cover: penuhi seluruh frame 1200x500 (bisa digeser/potong)
    // - contain: seluruh foto muat utuh 100% tanpa terpotong sedikitpun
    const baseScale =
      fitMode === "contain"
        ? Math.min(targetW / effW, targetH / effH)
        : Math.max(targetW / effW, targetH / effH);
    const totalScale = baseScale * scale;

    const dw = nw * totalScale;
    const dh = nh * totalScale;

    ctx.save();
    ctx.translate(targetW / 2 + pan.x, targetH / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }, [ratio, scale, pan, rotation, fitMode, status]);

  // Efek memuat gambar ketika modal dibuka
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    setStatus("loading");
    setErrorMessage(null);
    setScale(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setRatio(2.4);
    setFitMode("cover");
    setShowGuide(true);

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";

    const handleSuccess = () => {
      if (!active) return;
      loadedImgRef.current = img;
      setStatus("ready");
    };

    const handleError = () => {
      if (!active) return;
      setStatus("error");
      setErrorMessage("Gagal memuat gambar. Pastikan format berkas valid (JPG, PNG, WebP).");
    };

    img.onload = handleSuccess;
    img.onerror = handleError;
    img.src = imageSrc;

    // Jika gambar sudah selesai dimuat secara instan dari cache / blob
    if (img.complete && img.naturalWidth > 0) {
      handleSuccess();
    }

    return () => {
      active = false;
      loadedImgRef.current = null;
    };
  }, [isOpen, imageSrc]);

  // Gambar ulang kanvas setiap ada perubahan parameter (pan, zoom, rotate, ratio, fitMode)
  useEffect(() => {
    if (status === "ready") {
      renderCanvas();
    }
  }, [status, renderCanvas]);

  if (!isOpen || !imageSrc) return null;

  // Interaksi Drag / Pan (Mouse & Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== "ready" || isUploading) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || status !== "ready" || isUploading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mult = 1200 / (rect.width || 1);

    const dx = (e.clientX - dragStartRef.current.clientX) * mult;
    const dy = (e.clientY - dragStartRef.current.clientY) * mult;

    setPan({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy,
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

  // Zoom dengan Wheel / Trackpad
  const handleWheel = (e: React.WheelEvent) => {
    if (status !== "ready" || isUploading) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((prev) => Math.min(3.5, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  };

  // Tombol Aksi Cepat
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleResetCenter = () => {
    setPan({ x: 0, y: 0 });
    setScale(1.0);
  };

  // Simpan hasil potongan ke Server
  const handleCropAndUpload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "ready") return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Ekspor blob dari kanvas (WebP dengan fallback JPEG)
      const blob =
        (await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/webp", 0.9);
        })) ||
        (await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.9);
        }));

      if (!blob) throw new Error("Gagal mengompres gambar.");

      // Upload ke endpoint /api/admin/media
      const res = await apiUpload<{ id: string; url: string }>("/admin/media", blob);
      onCropComplete(res.url);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal mengunggah gambar hasil crop.");
    } finally {
      setIsUploading(false);
    }
  };

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
          {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

          {/* Kanvas Interaktif */}
          <div
            className={styles.canvasWrapper}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ aspectRatio: String(ratio) }}
          >
            {status === "loading" && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner} />
                <span>Memuat gambar dari galeri…</span>
              </div>
            )}

            <span className={styles.dragHint}>🖱️ Geser untuk mengatur posisi foto</span>

            {/* Kanvas Pemotong Gambar Langsung */}
            <canvas ref={canvasRef} className={styles.cropCanvas} />

            {/* Grid 3x3 Overlay (Opsional) */}
            {showGuide && (
              <div className={styles.gridOverlay}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={styles.gridCell} />
                ))}
              </div>
            )}

            {/* Safe Zone Visual Guide (Opsional) */}
            {showGuide && (
              <div className={styles.safeZoneGuide}>
                <div className={styles.safeZoneText}>
                  <span className={styles.safeZoneTextBadge}>Zona Teks &amp; Tombol</span>
                </div>
                <div className={styles.safeZoneFocus}>
                  <span className={styles.safeZoneFocusBadge}>Fokus Foto / Objek</span>
                </div>
              </div>
            )}
          </div>

          {/* Toolbar Pengontrol */}
          <div className={styles.toolbar}>
            {/* Mode Penyesuaian Foto (Cover vs Fit/Contain) */}
            <div className={styles.modeRow}>
              <span className={styles.ratioLabel}>Mode Penyesuaian Foto:</span>
              <div className={styles.modeChips}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${fitMode === "cover" ? styles.modeBtnActive : ""}`}
                  onClick={() => {
                    setFitMode("cover");
                    setScale(1.0);
                    setPan({ x: 0, y: 0 });
                  }}
                  disabled={status !== "ready" || isUploading}
                  title="Penuhi seluruh kanvas banner (dapat dipotong / digeser)"
                >
                  <span>🔲 Penuhi Frame (Cover)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${fitMode === "contain" ? styles.modeBtnActive : ""}`}
                  onClick={() => {
                    setFitMode("contain");
                    setScale(1.0);
                    setPan({ x: 0, y: 0 });
                  }}
                  disabled={status !== "ready" || isUploading}
                  title="Tampilkan seluruh foto tanpa ada bagian terpotong"
                >
                  <span>🖼️ Pas-kan Utuh (Fit / Contain)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${showGuide ? styles.modeBtnActive : ""}`}
                  onClick={() => setShowGuide((prev) => !prev)}
                  title="Tampilkan/sembunyikan garis bantu zona teks & fokus foto"
                >
                  <span>{showGuide ? "👁️ Garis Bantu Aktif" : "👁️ Garis Bantu Nonaktif"}</span>
                </button>
              </div>
            </div>

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
                    disabled={status !== "ready" || isUploading}
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
                  min="0.3"
                  max="3.0"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className={styles.zoomSlider}
                  aria-label="Atur tingkat zoom gambar"
                  disabled={status !== "ready" || isUploading}
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
                  disabled={status !== "ready" || isUploading}
                  title="Pusatkan posisi gambar"
                >
                  Pusatkan
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={handleRotate}
                  disabled={status !== "ready" || isUploading}
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
              disabled={status !== "ready" || isUploading}
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
