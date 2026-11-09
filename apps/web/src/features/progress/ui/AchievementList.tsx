"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from "@/shared/ui/icons";
import { progressApi, type Achievement } from "../data/progressApi";
import { AchievementBadge } from "./AchievementBadge";
import styles from "./achievementList.module.css";

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

/**
 * Daftar lencana medali bergaya Jepang interaktif:
 * Tampil dalam baris horizontal yang dapat digeser / di-scroll.
 * Setiap lencana memiliki ikon medali 3D SVG bergradasi tinggi, status pencapaian,
 * dan dapat diklik untuk membuka modal rincian syarat perolehan.
 */
export function AchievementList() {
  const [items, setItems] = useState<Achievement[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Achievement | null>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    let alive = true;
    progressApi
      .summary()
      .then((r) => alive && setItems(r.achievements))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const updateEdge = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdge();
    const ro = new ResizeObserver(updateEdge);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, updateEdge]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (failed) return null;
  const earned = items?.filter((a) => a.earnedAt) ?? [];
  const sorted = items ? [...earned, ...items.filter((a) => !a.earnedAt)] : [];
  const scrollable = !(edge.start && edge.end);

  return (
    <section className={styles.card} aria-labelledby="lencana-title">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span aria-hidden="true">🎖️</span>
          <h3 id="lencana-title" className={styles.title}>Lencana & Prestasi</h3>
        </div>
        {items && <span className={styles.count}>{earned.length} dari {items.length} diraih</span>}
        {scrollable && (
          <span className={styles.arrows}>
            <button type="button" className={styles.arrow} onClick={() => scrollBy(-1)} disabled={edge.start} aria-label="Lencana sebelumnya">
              <ArrowLeftIcon size={16} />
            </button>
            <button type="button" className={styles.arrow} onClick={() => scrollBy(1)} disabled={edge.end} aria-label="Lencana berikutnya">
              <ArrowRightIcon size={16} />
            </button>
          </span>
        )}
      </div>

      {!items ? (
        <p className={styles.loading}>Memuat koleksi lencana...</p>
      ) : (
        <div className={styles.viewport}>
          <ul ref={trackRef} className={styles.track} onScroll={updateEdge} tabIndex={0} aria-label="Daftar lencana, gulir ke samping">
            {sorted.map((a) => {
              const isEarned = Boolean(a.earnedAt);
              return (
                <li
                  key={a.code}
                  className={`${styles.item} ${isEarned ? styles.itemEarned : styles.itemLocked}`}
                  onClick={() => setSelected(a)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(a);
                    }
                  }}
                  aria-label={`${a.name}: ${isEarned ? "Sudah diraih" : "Terkunci"}`}
                >
                  <div className={styles.badgeWrap}>
                    <AchievementBadge code={a.code} earned={isEarned} size={58} />
                  </div>
                  <span className={styles.name}>{a.name}</span>
                  <span className={styles.desc}>{a.description}</span>
                  {isEarned ? (
                    <span className={styles.datePill}>
                      ✓ {dateFmt.format(new Date(a.earnedAt!))}
                    </span>
                  ) : (
                    <span className={styles.lockedPill}>🔒 Belum diraih</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── MODAL RINCIAN LENCANA ── */}
      {selected && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-lencana-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setSelected(null)}
              aria-label="Tutup rincian lencana"
            >
              <CloseIcon size={18} />
            </button>

            <div className={styles.modalBadgeStage}>
              <AchievementBadge code={selected.code} earned={Boolean(selected.earnedAt)} size={92} />
            </div>

            <h4 id="modal-lencana-title" className={styles.modalTitle}>
              {selected.name}
            </h4>
            <p className={styles.modalDesc}>{selected.description}</p>

            <div
              className={`${styles.modalStatusCard} ${
                selected.earnedAt ? styles.modalStatusEarned : styles.modalStatusLocked
              }`}
            >
              {selected.earnedAt ? (
                <>
                  <span>🎉 Berhasil Diraih!</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, opacity: 0.9 }}>
                    Dibuka pada {dateFmt.format(new Date(selected.earnedAt))}
                  </span>
                </>
              ) : (
                <>
                  <span>🔒 Lencana Masih Terkunci</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, opacity: 0.85 }}>
                    Selesaikan target belajar di atas untuk membuka lencana ini.
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              className={styles.modalDoneBtn}
              onClick={() => setSelected(null)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
