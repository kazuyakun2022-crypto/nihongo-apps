"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { ReadinessCard } from "@/features/exam/ui/ReadinessCard";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";
import { learningApi } from "../data/learningApi";
import { useChapters, useLevels } from "../application/useLevels";
import type { ChapterSummary, LevelProgress } from "../domain/types";
import styles from "./learningPath.module.css";

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

function countLabel(c: ChapterSummary) {
  return [
    c.counts.vocab && `${c.counts.vocab} kata`,
    c.counts.kanji && `${c.counts.kanji} kanji`,
    c.counts.grammar && `${c.counts.grammar} pola`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Pct({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className={styles.meter} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.meterFill} style={{ width: `${pct}%` }}>
        <div className={styles.meterShimmer} aria-hidden />
      </div>
    </div>
  );
}

function LearningPathSkeleton() {
  return (
    <SkeletonRegion label="Memuat bab…" style={{ display: "contents" }}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <Skeleton width="5rem" height="0.75rem" />
          <Skeleton width="10rem" height="1.25rem" />
          <Skeleton height="0.5rem" radius="var(--radius-pill)" />
        </div>
        <div className={styles.heroMain}>
          <Skeleton width="6rem" height="0.75rem" />
          <SkeletonText lines={2} />
          <Skeleton width="9rem" height="2.75rem" radius="var(--radius-pill)" />
        </div>
      </section>
      <section className={styles.units}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.unit}>
            <div className={styles.unitHead}>
              <Skeleton circle width={36} />
              <div style={{ flex: 1, display: "grid", gap: "var(--space-2)" }}>
                <Skeleton width={`${60 - i * 8}%`} />
                <Skeleton width="25%" height="0.75rem" />
              </div>
            </div>
          </div>
        ))}
      </section>
    </SkeletonRegion>
  );
}

export function LearningPath() {
  const { user } = useAuth();
  const { levels, error } = useLevels();
  const [levelId, setLevelId] = useState<number | null>(null);
  const chapters = useChapters(levelId);
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [openUnits, setOpenUnits] = useState<Set<string>>(new Set());

  // Level awal: level akun siswa, kalau tidak ada pakai level pertama yang terbuka
  useEffect(() => {
    if (!levels || levelId !== null) return;
    const mine = levels.find((l) => l.id === user?.currentLevelId && !l.locked);
    setLevelId((mine ?? levels.find((l) => !l.locked) ?? levels[0])?.id ?? null);
  }, [levels, levelId, user?.currentLevelId]);

  useEffect(() => {
    if (levelId === null) return;
    setProgress(null);
    learningApi.getProgress(levelId).then(setProgress).catch(() => setProgress(null));
  }, [levelId, chapters]);

  const units = useMemo(() => (chapters ? groupIntoUnits(chapters) : []), [chapters]);
  const next = chapters?.find((c) => c.status === "open") ?? null;
  const done = chapters?.filter((c) => c.status === "completed").length ?? 0;

  // Unit yang berisi bab berikutnya selalu terbuka saat level dipilih
  useEffect(() => {
    const current = units.find((u) => u.chapters.some((c) => c.id === next?.id)) ?? units[0];
    setOpenUnits(new Set(current ? [current.key] : []));
  }, [units, next?.id]);

  const level = levels?.find((l) => l.id === levelId);
  const isTopLevel = !!levels && !!level && level.id === Math.max(...levels.map((l) => l.id));

  if (error) return <p className={styles.state}>{error}</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow} lang="ja">べんきょう</p>
          <h1 className={styles.title}>Belajar</h1>
        </div>
        <div className={styles.levelTabs} role="tablist" aria-label="Pilih level">
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
              {l.locked && <span aria-hidden>🔒</span>}
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
          <section className={styles.hero}>
            <div className={styles.heroMain}>
              <span className={styles.heroLevel}>{level.name}</span>
              <p className={styles.heroStat}>
                <strong>{done}</strong> / {chapters.length} bab selesai
              </p>
              <Pct value={done} total={chapters.length} />
              {progress && (progress.vocabTarget > 0 || progress.kanjiTarget > 0) && (
                <dl className={styles.heroMetrics}>
                  {progress.vocabTarget > 0 && (
                    <div>
                      <dt>Kosakata</dt>
                      <dd>
                        {progress.vocabLearned}
                        <span>/{progress.vocabTarget}</span>
                      </dd>
                    </div>
                  )}
                  {progress.kanjiTarget > 0 && (
                    <div>
                      <dt>Kanji</dt>
                      <dd>
                        {progress.kanjiLearned}
                        <span>/{progress.kanjiTarget}</span>
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
            <div className={styles.heroNext}>
              {next ? (
                <>
                  <span className={styles.nextLabel}>
                    <span className={styles.pulseDot} aria-hidden />
                    {done === 0 ? "Mulai dari sini" : "Lanjutkan"}
                  </span>
                  <p className={styles.nextTitle}>{next.title}</p>
                  {countLabel(next) && <p className={styles.nextMeta}>{countLabel(next)}</p>}
                  <Link href={`/belajar/${next.id}`} className={styles.primaryBtn}>
                    <span>{done === 0 ? "Mulai belajar" : "Lanjut belajar"}</span>
                    <span className={styles.btnArrow} aria-hidden>→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Mascot mood="senang" size={56} />
                  <p className={styles.nextTitle}>Semua bab {level.code} selesai!</p>
                  <p className={styles.nextMeta}>{isTopLevel ? "Kamu sudah di level tertinggi. Saatnya ikut Ujian Kelulusan Akhir." : "Saatnya ikut ujian naik level."}</p>
                </>
              )}
            </div>
          </section>

          <ReadinessCard levelId={level.id} levelCode={level.code} final={isTopLevel} />

          <nav className={styles.extras} aria-label="Latihan tambahan">
            <Link href="/belajar/tulis-buku" className={styles.extraCard}>
              <span className={styles.extraIcon} aria-hidden>✍️</span>
              <span>
                <strong>Tulis di Buku</strong>
                <small>Cetak lembar, tulis dengan pensil, foto untuk dikoreksi.</small>
              </span>
            </Link>
            <Link href="/kamus?tab=ungkapan" className={styles.extraCard}>
              <span className={styles.extraIcon} aria-hidden>📚</span>
              <span>
                <strong>Kamus Levelmu</strong>
                <small>Kosakata, kanji, tata bahasa, ungkapan & sebutan.</small>
              </span>
            </Link>
          </nav>

          <section className={styles.units} aria-label="Daftar unit">
            {units.map((unit, ui) => {
              const unitDone = unit.chapters.filter((c) => c.status === "completed").length;
              const locked = unit.chapters.every((c) => c.status === "locked");
              const open = openUnits.has(unit.key);
              const toggle = () =>
                setOpenUnits((s) => {
                  const n = new Set(s);
                  if (n.has(unit.key)) n.delete(unit.key);
                  else n.add(unit.key);
                  return n;
                });
              return (
                <article key={unit.key} className={`${styles.unit} ${locked ? styles.unitLocked : ""}`}>
                  <button type="button" className={styles.unitHead} onClick={toggle} aria-expanded={open}>
                    <span className={`${styles.unitBadge} ${unitDone === unit.chapters.length ? styles.unitBadgeDone : ""}`}>
                      {unitDone === unit.chapters.length ? "✓" : ui + 1}
                    </span>
                    <span className={styles.unitText}>
                      <span className={styles.unitTitle}>{unit.title}</span>
                      <span className={styles.unitMeta}>
                        {unitDone}/{unit.chapters.length} bab {locked && "· terkunci"}
                      </span>
                    </span>
                    <span className={styles.unitChevron} aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`${styles.chevronIcon} ${open ? styles.chevronIconOpen : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  {open && (
                    <ol className={styles.chapterList}>
                      {unit.chapters.map((c, ci) => {
                        const isNext = c.id === next?.id;
                        const inner = (
                          <>
                            <span className={`${styles.dot} ${styles[`dot_${c.status}`]} ${isNext ? styles.dotNext : ""}`} aria-hidden>
                              {c.status === "completed" ? "✓" : c.status === "locked" ? "🔒" : "▶"}
                            </span>
                            <span className={styles.chapterText}>
                              <span className={styles.chapterTitle}>{c.title}</span>
                              {countLabel(c) && <span className={styles.chapterMeta}>{countLabel(c)}</span>}
                            </span>
                            {c.bestScore !== null && <span className={styles.score}>{c.bestScore}%</span>}
                          </>
                        );
                        return (
                          <li
                            key={c.id}
                            className={styles.chapterItem}
                            style={{ "--ci": ci } as React.CSSProperties}
                          >
                            {c.status === "locked" ? (
                              <div className={`${styles.chapterRow} ${styles.chapterRowLocked}`} title="Selesaikan bab sebelumnya dulu">
                                {inner}
                              </div>
                            ) : (
                              <Link href={`/belajar/${c.id}`} className={`${styles.chapterRow} ${isNext ? styles.chapterRowNext : ""}`}>
                                {inner}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
