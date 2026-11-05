"use client";

import { useEffect, useState } from "react";
import { LockIcon, TrophyIcon } from "@/shared/ui/icons";
import { progressApi, type Achievement } from "../data/progressApi";
import styles from "./achievementList.module.css";

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

/** Daftar lencana: yang sudah didapat di depan, sisanya tampil terkunci beserta syaratnya. */
export function AchievementList() {
  const [items, setItems] = useState<Achievement[] | null>(null);
  const [failed, setFailed] = useState(false);

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

  if (failed) return null;
  const earned = items?.filter((a) => a.earnedAt) ?? [];
  const sorted = items ? [...earned, ...items.filter((a) => !a.earnedAt)] : [];

  return (
    <section className={styles.card} aria-labelledby="lencana-title">
      <div className={styles.header}>
        <h3 id="lencana-title" className={styles.title}>Lencana</h3>
        {items && <span className={styles.count}>{earned.length} dari {items.length}</span>}
      </div>
      {!items ? (
        <p className={styles.loading}>Memuat lencana...</p>
      ) : (
        <ul className={styles.grid}>
          {sorted.map((a) => (
            <li key={a.code} className={a.earnedAt ? styles.item : `${styles.item} ${styles.locked}`}>
              <span className={styles.icon} aria-hidden="true">
                {a.earnedAt ? <TrophyIcon size={18} /> : <LockIcon size={16} />}
              </span>
              <span className={styles.name}>{a.name}</span>
              <span className={styles.desc}>{a.description}</span>
              {a.earnedAt && <span className={styles.date}>{dateFmt.format(new Date(a.earnedAt))}</span>}
              <span className="visually-hidden">{a.earnedAt ? "Sudah didapat" : "Belum didapat"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
