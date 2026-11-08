"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { scenarioApi } from "../data/conversationApi";
import type { ScenarioItem } from "../domain/types";
import { FuriganaText } from "./FuriganaText";
import styles from "./scenarioList.module.css";

const LEVEL_TABS = [
  { id: "ALL", label: "Semua Skenario" },
  { id: "N5", label: "JLPT N5" },
  { id: "N4", label: "JLPT N4" },
  { id: "N3", label: "JLPT N3" },
  { id: "N2", label: "JLPT N2" },
];

export function ScenarioList() {
  const [items, setItems] = useState<ScenarioItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    scenarioApi.list().then(setItems).catch((err: Error) => setError(err.message));
  }, []);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((s) => {
      const matchLevel =
        selectedLevel === "ALL" ||
        s.levelCode.toUpperCase() === selectedLevel ||
        (selectedLevel === "N5" && s.levelCode.toUpperCase() === "PEMULA");

      const q = query.trim().toLowerCase();
      if (!q) return matchLevel;

      const matchText =
        s.title.toLowerCase().includes(q) ||
        s.goal.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        (s.userRole && s.userRole.toLowerCase().includes(q)) ||
        (s.mascotRole && s.mascotRole.toLowerCase().includes(q)) ||
        (s.keigoType && s.keigoType.toLowerCase().includes(q));

      return matchLevel && matchText;
    });
  }, [items, selectedLevel, query]);

  if (error) return <Alert>{error}</Alert>;
  if (!items) {
    return (
      <SkeletonRegion label="Memuat skenario percakapan…" className={styles.grid}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height="16rem" radius="var(--radius-lg)" />
        ))}
      </SkeletonRegion>
    );
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div className={styles.heroTitle}>
          <span>Skenario Percakapan Nyata</span>
          <span className={styles.heroTitleJa} lang="ja">実戦ロールプレイ</span>
        </div>
        <p className={styles.lead}>
          Latihan percakapan situasi nyata di Jepang. Miu-chan memainkan peran sebagai kasir, pelayan, dokter, maupun temanmu dengan Keigo yang tepat. Setiap balasanmu dianalisis dan dikoreksi secara lembut.
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.searchBar}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.searchIcon}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari skenario (mis. konbini, ryokan, salon, klinik, tiket)..."
            className={styles.searchInput}
            aria-label="Cari skenario percakapan"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}
              aria-label="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>

        <div className={styles.filterTabs} role="tablist" aria-label="Filter Level JLPT">
          {LEVEL_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selectedLevel === tab.id}
              className={`${styles.filterBtn} ${selectedLevel === tab.id ? styles.filterBtnActive : ""}`}
              onClick={() => setSelectedLevel(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className={styles.empty}>
          <p>Tidak ada skenario yang sesuai dengan pencarian atau filter level yang dipilih.</p>
        </div>
      ) : (
        <ul className={styles.grid} data-spotlight="ngobrol-skenario">
          {filteredItems.map((s) => {
            const imgUrl = s.imageUrl || "/images/scenarios/01_Misi_Pertama_di_Konbini.png";
            return (
              <li key={s.id}>
                <Link
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
                    {s.location && (
                      <span className={styles.locationBadge}>
                        {s.location}
                      </span>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{s.title}</h3>

                    <div className={styles.roleRow}>
                      <span className={styles.roleUser}>{s.userRole || "Siswa"}</span>
                      <span>⇄</span>
                      <span className={styles.roleMascot}>{s.mascotRole || "Miu-chan"}</span>
                    </div>

                    <p className={styles.cardGoal}>{s.goal}</p>

                    {s.targetGrammar && s.targetGrammar.length > 0 && (
                      <div className={styles.chips} lang="ja">
                        {s.targetGrammar.slice(0, 3).map((g) => (
                          <span key={g} className={styles.chip}>
                            <FuriganaText text={g} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFoot}>
                    {s.keigoType ? (
                      <span className={styles.keigoBadge}>{s.keigoType}</span>
                    ) : (
                      <span />
                    )}
                    <span className={styles.playBtn}>
                      Latihan <span>→</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
