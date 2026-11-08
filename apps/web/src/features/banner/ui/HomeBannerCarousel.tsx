"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bannerApi } from "../data/bannerApi";
import type { BannerItem } from "../domain/types";
import { getBannerShadingStyle } from "../domain/shading";
import styles from "./homeBannerCarousel.module.css";

const AUTOPLAY_INTERVAL_MS = 4500;

export function HomeBannerCarousel() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    bannerApi
      .listActive()
      .then((items) => {
        if (alive) setBanners(items);
      })
      .catch((err) => {
        console.error("Gagal memuat banner rekomendasi:", err);
      });
    return () => {
      alive = false;
    };
  }, []);

  const total = banners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Autoplay timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [total, isPaused, nextSlide]);

  // Touch gesture support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    setTouchStartX(null);
    setIsPaused(false);
  };

  // Jangan tampilkan apa pun jika belum ada banner yang diaktifkan oleh admin
  if (total === 0) {
    return null;
  }

  return (
    <section
      className={styles.carouselSection}
      aria-label="Rekomendasi dan Pengumuman"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.carouselContainer}>
        {/* Track Slider Bergerak ke Samping */}
        <div
          className={styles.track}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((item, idx) => {
            const isExternal = item.linkUrl.startsWith("http://") || item.linkUrl.startsWith("https://");

            const content = (
              <>
                {/* Latar Belakang Gambar Banner & Fallback Motif Jepang */}
                <div className={styles.imageWrap}>
                  <img
                    src={item.imageUrl}
                    alt=""
                    className={styles.bannerImg}
                    loading={idx === 0 ? "eager" : "lazy"}
                    onError={(e) => {
                      // Sembunyikan gambar jika gagal/offline agar tidak muncul ikon rusak browser
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <div
                    className={styles.overlay}
                    style={getBannerShadingStyle(item.shadingPosition, item.shadingOpacity)}
                  />
                  <span className={styles.watermarkKanji} aria-hidden="true" lang="ja">
                    推
                  </span>
                </div>

                {/* Konten Teks & Aksi */}
                <div className={styles.bannerContent}>
                  {item.badge && <span className={styles.badge}>{item.badge}</span>}
                  <h3 className={styles.title}>{item.title}</h3>
                  {item.description && <p className={styles.desc}>{item.description}</p>}

                  <div className={styles.actionRow}>
                    <span className={styles.actionBtn}>
                      <span>Buka Sekarang</span>
                      <span className={styles.actionArrow} aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              </>
            );

            return (
              <div key={item.id} className={styles.slide} aria-hidden={idx !== currentIndex}>
                {isExternal ? (
                  <a
                    href={item.linkUrl}
                    target={item.target || "_blank"}
                    rel="noopener noreferrer"
                    className={styles.bannerLink}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    href={item.linkUrl}
                    target={item.target || "_self"}
                    className={styles.bannerLink}
                  >
                    {content}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Tombol Panah Navigasi Manual (hanya jika banner > 1) */}
        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.prevBtn}`}
              onClick={prevSlide}
              aria-label="Slide sebelumnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.nextBtn}`}
              onClick={nextSlide}
              aria-label="Slide berikutnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Indikator Titik Posisi Slide */}
        {total > 1 && (
          <div className={styles.dots} role="tablist" aria-label="Pilih slide">
            {banners.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                role="tab"
                aria-selected={dotIdx === currentIndex}
                aria-label={`Lihat banner ${dotIdx + 1}`}
                className={`${styles.dot} ${dotIdx === currentIndex ? styles.dotActive : ""}`}
                onClick={() => setCurrentIndex(dotIdx)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

