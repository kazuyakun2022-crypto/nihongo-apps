"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, LockIcon, TrophyIcon } from "@/shared/ui/icons";
import { progressApi, type Achievement } from "../data/progressApi";
import styles from "./achievementList.module.css";

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

/**
 * Daftar lencana dalam satu baris yang digulir ke samping (geser jari di ponsel, tombol panah di desktop).
 * Yang sudah didapat di depan, sisanya tampil terkunci beserta syaratnya.
 */
export function AchievementList() {
  const [items, setItems] = useState<Achievement[] | null>(null);
  const [failed, setFailed] = useState(false);
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

  // Tombol panah dimatikan saat sudah mentok di ujung; tepi pudar juga mengikuti
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
        <h3 id="lencana-title" className={styles.title}>Lencana</h3>
        {items && <span className={styles.count}>{earned.length} dari {items.length}</span>}
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
        <p className={styles.loading}>Memuat lencana...</p>
      ) : (
        <div className={styles.viewport} data-start={edge.start || undefined} data-end={edge.end || undefined}>
          <ul ref={trackRef} className={styles.track} onScroll={updateEdge} tabIndex={0} aria-label="Daftar lencana, gulir ke samping">
            {sorted.map((a) => (
              <li key={a.code} className={a.earnedAt ? styles.item : `${styles.item} ${styles.locked}`}>
                <span className={styles.icon} aria-hidden="true">
                  {a.earnedAt ? <TrophyIcon size={20} /> : <LockIcon size={18} />}
                </span>
                <span className={styles.name}>{a.name}</span>
                <span className={styles.desc}>{a.description}</span>
                <span className={styles.date}>{a.earnedAt ? dateFmt.format(new Date(a.earnedAt)) : "Belum didapat"}</span>
                <span className="visually-hidden">{a.earnedAt ? "Sudah didapat" : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
