"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { scenarioApi } from "../data/conversationApi";
import type { ScenarioItem } from "../domain/types";
import styles from "./homeScenarioCarousel.module.css";

export function HomeScenarioCarousel() {
  const [scenarios, setScenarios] = useState<ScenarioItem[] | null>(null);

  useEffect(() => {
    let active = true;
    scenarioApi
      .list()
      .then((items) => {
        if (active) setScenarios(items);
      })
      .catch(() => {
        if (active) setScenarios([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (scenarios === null || scenarios.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="Skenario Percakapan Interaktif">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.titleJa} lang="ja">
            場面会話ロールプレイ
          </span>
          <h2 className={styles.title}>Skenario Situasi Nyata</h2>
        </div>
        <Link href="/ngobrol?tab=skenario" className={styles.seeAllLink}>
          Lihat semua ({scenarios.length}) →
        </Link>
      </div>

      <div className={styles.scrollTrack} role="region" aria-label="Daftar skenario situasi nyata">
        {scenarios.map((s) => {
          const imgUrl = s.imageUrl || "/images/scenarios/01_Misi_Pertama_di_Konbini.png";
          return (
            <Link
              key={s.id}
              href={`/ngobrol/skenario/${s.id}`}
              className={styles.card}
              title={`Mulai latihan ${s.title}`}
            >
              <div className={styles.imageWrap}>
                <img
                  src={imgUrl}
                  alt={s.title}
                  className={styles.image}
                  loading="lazy"
                />
                <div className={styles.imageOverlay} />
                <span className={styles.levelBadge}>{s.levelCode}</span>
              </div>

              <h3 className={styles.cardTitle}>{s.title}</h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
