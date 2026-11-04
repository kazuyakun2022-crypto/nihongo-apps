"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { useChapters, useLevels } from "../application/useLevels";
import type { ChapterSummary } from "../domain/types";
import styles from "./learningPath.module.css";
import { SceneBackdrop, TIME_LABEL, realmOf, useTimeOfDay } from "./MapScenery";
import scenery from "./scenery.module.css";
import { WorldMap } from "./WorldMap";

interface Unit {
  key: string;
  title: string;
  chapters: ChapterSummary[];
}

/**
 * Bab berurutan dengan modul sama (diatur admin) menjadi satu unit. Tanpa modul, bab berurutan dengan judul dasar
 * sama ("Makanan & Minuman 1", "… 2") digabung; bab tunggal yang berdampingan dikumpulkan jadi unit "Materi Pilihan".
 */
function groupIntoUnits(chapters: ChapterSummary[]): Unit[] {
  const base = (t: string) => t.replace(/\s+\d+$/, "").trim();
  const keyOf = (c: ChapterSummary) => (c.moduleTitle ? `modul:${c.moduleTitle}` : `judul:${base(c.title)}`);
  const runs: (Unit & { isModule: boolean })[] = [];
  for (const c of chapters) {
    const last = runs[runs.length - 1];
    if (last && keyOf(last.chapters[0]) === keyOf(c)) last.chapters.push(c);
    else runs.push({ key: c.id, title: c.moduleTitle ?? base(c.title), chapters: [c], isModule: !!c.moduleTitle });
  }
  const units: Unit[] = [];
  for (const run of runs) {
    if (run.isModule) {
      units.push(run);
      continue;
    }
    const prev = units[units.length - 1];
    if (run.chapters.length === 1 && prev?.title === "Materi Pilihan") prev.chapters.push(run.chapters[0]);
    else if (run.chapters.length === 1 && runs.length > 1) units.push({ key: run.key, title: "Materi Pilihan", chapters: [...run.chapters] });
    else units.push(run);
  }
  return units;
}

function LearningPathSkeleton() {
  return (
    <SkeletonRegion label="Memuat bab…" style={{ display: "contents" }}>
      <section className={styles.mapSkeleton}>
        <Skeleton height="4rem" radius="var(--radius-lg)" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} circle width={64} style={{ marginLeft: `calc(50% - 32px + ${[0, 43, 72, 43][i]}px)` }} />
        ))}
      </section>
    </SkeletonRegion>
  );
}

export function LearningPath() {
  const { user } = useAuth();
  const { levels, error } = useLevels();
  const [levelId, setLevelId] = useState<number | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Tab level aktif selalu terlihat di baris tab yang bisa digeser (ponsel sempit)
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [levelId]);
  const chapters = useChapters(levelId);

  // Level awal: level akun siswa, kalau tidak ada pakai level pertama yang terbuka
  useEffect(() => {
    if (!levels || levelId !== null) return;
    const mine = levels.find((l) => l.id === user?.currentLevelId && !l.locked);
    setLevelId((mine ?? levels.find((l) => !l.locked) ?? levels[0])?.id ?? null);
  }, [levels, levelId, user?.currentLevelId]);

  const units = useMemo(() => (chapters ? groupIntoUnits(chapters) : []), [chapters]);
  const next = chapters?.find((c) => c.status === "open") ?? null;

  const level = levels?.find((l) => l.id === levelId);
  const time = useTimeOfDay();

  if (error) return <p className={styles.state}>{error}</p>;

  return (
    <div className={`${styles.page} ${scenery.realm}`} data-realm={level?.code} data-time={time ?? undefined}>
      {level && <SceneBackdrop code={level.code} time={time} />}
      <header className={styles.header}>
        <div>
          <p className={`${styles.eyebrow} ${scenery.ink}`} lang="ja">べんきょう</p>
          <h1 className={`${styles.title} ${scenery.ink}`}>Belajar</h1>
        </div>
        <div ref={tabsRef} className={styles.levelTabs} role="tablist" aria-label="Pilih level" data-spotlight="belajar-level">
          {!levels &&
            [0, 1, 2, 3].map((i) => <Skeleton key={i} width="3.5rem" height="2.25rem" radius="var(--radius-pill)" />)}
          {(levels ?? []).map((l) => (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={l.id === levelId}
              className={`${styles.levelTab} ${l.id === levelId ? styles.levelTabActive : ""}`}
              onClick={() => setLevelId(l.id)}
              disabled={l.locked}
              title={l.lockReason === "level" ? "Terbuka setelah lulus tes naik tahap" : l.locked ? "Tersedia untuk pengguna Premium" : l.name}
            >
              {l.locked && (
                <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              )}
              {l.code === "PEMULA" ? "Pemula" : l.code}
            </button>
          ))}
        </div>
      </header>

      {!chapters || !level ? (
        <LearningPathSkeleton />
      ) : chapters.length === 0 ? (
        <div className={styles.state}>
          <Mascot mood="berpikir" size={72} />
          <p>Materi {level.name} sedang disiapkan. Coba level lain dulu ya.</p>
        </div>
      ) : (
        <>
          <p className={scenery.realmTag}>
            <small>
              Wilayah {level.code === "PEMULA" ? "Pemula" : level.code}
              {time && ` · ${TIME_LABEL[time]}`}
            </small>
            <strong>{realmOf(level.code).name}</strong>
          </p>
          <WorldMap units={units} nextId={next?.id ?? null} level={level} />
        </>
      )}
    </div>
  );
}
