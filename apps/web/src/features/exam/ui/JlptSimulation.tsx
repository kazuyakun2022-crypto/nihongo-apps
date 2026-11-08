"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { LockIcon, ShuffleIcon, TimerIcon, TrophyIcon } from "@/shared/ui/icons";
import { examApi, type JlptSimLevel } from "../data/examApi";
import { JlptExam } from "./JlptExam";
import runnerStyles from "./levelUpTest.module.css";
import styles from "./jlptSimulation.module.css";

const BASE = "/simulasi";
const PACKAGE_TOTAL = 10;
const MAX_SCORE = 180;
const HISTORY_SHOWN = 5;
const pad = (n: number) => String(n).padStart(2, "0");
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

/** Gambaran kemampuan tiap tingkat (ringkasan dari deskripsi resmi JLPT) dan urutan kesulitannya. */
const LEVEL_INFO: Record<string, { desc: string; difficulty: number }> = {
  N5: { desc: "Memahami ungkapan dan kalimat dasar dalam hiragana, katakana, dan kanji sederhana.", difficulty: 1 },
  N4: { desc: "Memahami bahasa Jepang dasar untuk percakapan dan bacaan sehari-hari.", difficulty: 2 },
  N3: { desc: "Memahami bahasa Jepang dalam situasi sehari-hari sampai tingkat tertentu.", difficulty: 3 },
  N2: { desc: "Memahami bahasa sehari-hari dan situasi yang lebih luas, termasuk berita.", difficulty: 4 },
  N1: { desc: "Memahami bahasa Jepang dalam berbagai situasi, termasuk tulisan yang kompleks.", difficulty: 5 },
};

/**
 * Simulasi JLPT, tiga layar:
 * 1. tanpa parameter            → pilih tingkat (N5–N1)
 * 2. ?levelId=N                 → daftar paket soal tingkat itu
 * 3. ?levelId=N&paket=3 | acak  → layar ujian
 */
export function JlptSimulation() {
  const params = useSearchParams();
  const levelId = Number(params.get("levelId"));
  const paketParam = params.get("paket");
  if (!Number.isInteger(levelId) || levelId < 1) return <LevelPicker />;
  if (paketParam === null) return <LevelPackages levelId={levelId} />;
  const n = Number(paketParam);
  const paket = Number.isInteger(n) && n >= 1 && n <= PACKAGE_TOTAL ? n : null;
  return <JlptExam key={`${levelId}-${paketParam}`} levelId={levelId} paket={paket} backHref={`${BASE}?levelId=${levelId}`} />;
}

/** Data semua tingkat dimuat sekali; layar paket memakai data yang sama. */
function useLevels() {
  const [levels, setLevels] = useState<JlptSimLevel[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    examApi
      .jlptSimLevels()
      .then((l) => alive && setLevels(l))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  return { levels, failed };
}

function LoadFailed() {
  return (
    <p className={runnerStyles.errorBox} role="alert">
      Simulasi belum bisa dimuat. Periksa koneksi, lalu muat ulang halaman.
    </p>
  );
}

/** Bilah skor 0–180 dengan garis batas lulus; menunjukkan seberapa jauh skor dari kelulusan. */
function ScoreBar({ score, pass, compact }: { score: number | null; pass: number; compact?: boolean }) {
  const passed = score !== null && score >= pass;
  return (
    <span
      className={`${styles.scoreBar} ${compact ? styles.scoreBarCompact : ""}`}
      role="img"
      aria-label={score === null ? "Belum ada skor" : `Skor ${score} dari ${MAX_SCORE}, batas lulus ${pass}`}
    >
      {score !== null && (
        <span className={`${styles.scoreFill} ${passed ? styles.scoreFillPass : ""}`} style={{ width: `${(score / MAX_SCORE) * 100}%` }} />
      )}
      <span className={styles.passMark} style={{ left: `${(pass / MAX_SCORE) * 100}%` }} />
    </span>
  );
}

/** Lima ruas: tingkat kesulitan relatif N5 (1) sampai N1 (5). */
function Difficulty({ value }: { value: number }) {
  return (
    <span className={styles.difficulty} role="img" aria-label={`Tingkat kesulitan ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? styles.diffOn : styles.diffOff} />
      ))}
    </span>
  );
}

// ── Layar 1: pilih tingkat ──
function LevelPicker() {
  const { levels, failed } = useLevels();
  const { user } = useAuth();

  return (
    <div className={styles.wrap}>
      <header className={styles.intro}>
        <h1 className={styles.title}>Simulasi JLPT</h1>
        <p className={styles.lead}>
          Pilih tingkat, lalu kerjakan paket soal dengan susunan ujian resmi: sesi berwaktu, lembar jawaban bulat, dan skor 0–180.
          Hasilnya tidak mengubah levelmu.
        </p>
      </header>

      {failed ? (
        <LoadFailed />
      ) : !levels ? (
        <SkeletonRegion label="Memuat tingkat…" className={styles.levelList}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="7.5rem" radius="var(--radius-lg)" />
          ))}
        </SkeletonRegion>
      ) : (
        <ul className={styles.levelList}>
          {levels.map((l) => {
            const info = LEVEL_INFO[l.code];
            const mine = user?.currentLevelId === l.levelId;
            const body = (
              <>
                <span className={styles.levelBadge} aria-hidden="true">{l.code}</span>
                <span className={styles.levelBody}>
                  <span className={styles.levelName}>
                    {l.name}
                    {mine && <span className={styles.mineTag}>Levelmu</span>}
                  </span>
                  <span className={styles.levelDesc}>{info?.desc}</span>
                  <span className={styles.levelFacts}>
                    {info && <Difficulty value={info.difficulty} />}
                    <span>
                      <TimerIcon size={13} /> {l.timeLimitMin} mnt
                    </span>
                    <span>{l.available ? `${l.packages.length} paket` : "Belum ada soal"}</span>
                  </span>
                </span>
                <span className={styles.levelScore}>
                  {l.bestScore === null ? (
                    <span className={styles.levelScoreEmpty}>Belum dicoba</span>
                  ) : (
                    <span className={styles.levelScoreValue}>
                      <strong>{l.bestScore}</strong>/{MAX_SCORE}
                      {l.passedCount > 0 && <TrophyIcon size={14} className={styles.trophy} title="Pernah lulus" />}
                    </span>
                  )}
                  <ScoreBar score={l.bestScore} pass={l.passScore} />
                  <span className={styles.levelPass}>Lulus {l.passScore}</span>
                </span>
              </>
            );
            return (
              <li key={l.levelId}>
                {l.available ? (
                  <Link href={`${BASE}?levelId=${l.levelId}`} className={`${styles.levelCard} ${mine ? styles.levelMine : ""}`}>
                    {body}
                  </Link>
                ) : (
                  <div className={`${styles.levelCard} ${styles.levelLocked}`} aria-disabled="true">
                    {body}
                    <LockIcon size={16} className={styles.lockIcon} title="Bank soal belum tersedia" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/beranda" className={runnerStyles.backLink}>← Kembali ke Beranda</Link>
    </div>
  );
}

// ── Layar 2: paket soal satu tingkat ──
function LevelPackages({ levelId }: { levelId: number }) {
  const { levels, failed } = useLevels();
  const [showAll, setShowAll] = useState(false);
  const level = levels?.find((l) => l.levelId === levelId);

  if (failed) {
    return (
      <div className={styles.wrap}>
        <LoadFailed />
        <Link href={BASE} className={styles.crumb}>← Semua tingkat</Link>
      </div>
    );
  }
  if (!levels) {
    return (
      <SkeletonRegion label="Memuat paket…" className={styles.wrap}>
        <Skeleton width="8rem" />
        <Skeleton height="5rem" radius="var(--radius-lg)" />
        <Skeleton height="7rem" radius="var(--radius-lg)" />
        <div className={styles.packageCards}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height="9rem" radius="var(--radius-lg)" />
          ))}
        </div>
      </SkeletonRegion>
    );
  }
  if (!level) {
    return (
      <div className={styles.wrap}>
        <p className={runnerStyles.errorBox} role="alert">Tingkat ini tidak punya simulasi JLPT.</p>
        <Link href={BASE} className={styles.crumb}>← Semua tingkat</Link>
      </div>
    );
  }

  const info = LEVEL_INFO[level.code];
  const totalMinutes = level.sessions.reduce((n, s) => n + s.minutes, 0) || 1;
  const history = showAll ? level.recent : level.recent.slice(0, HISTORY_SHOWN);

  return (
    <div className={styles.wrap}>
      <Link href={BASE} className={styles.crumb}>← Semua tingkat</Link>

      <header className={styles.levelHero}>
        <span className={styles.heroBadge} aria-hidden="true">{level.code}</span>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Simulasi {level.name}</h1>
          <p className={styles.lead}>{info?.desc}</p>
        </div>
      </header>

      <section className={styles.summary} aria-labelledby="susunan-title">
        <h2 id="susunan-title" className="visually-hidden">Susunan ujian</h2>
        <dl className={styles.summaryStats}>
          <div>
            <dt>Waktu</dt>
            <dd>{level.timeLimitMin} menit</dd>
          </div>
          <div>
            <dt>Batas lulus</dt>
            <dd>{level.passScore}/{MAX_SCORE}</dd>
          </div>
          <div>
            <dt>Skor terbaik</dt>
            <dd>{level.bestScore === null ? "–" : `${level.bestScore}/${MAX_SCORE}`}</dd>
          </div>
        </dl>
        {/* Panjang tiap ruas sebanding dengan waktu sesinya */}
        <div className={styles.timeline} aria-hidden="true">
          {level.sessions.map((s) => (
            <span key={s.key} className={styles.timelineSeg} style={{ flexGrow: s.minutes }} />
          ))}
        </div>
        <ol className={styles.sessionLegend}>
          {level.sessions.map((s, i) => (
            <li key={s.key} style={{ flexGrow: s.minutes, flexBasis: `${(s.minutes / totalMinutes) * 100}%` }}>
              <span className={styles.sessionNo}>Sesi {i + 1}</span>
              <span className={styles.sessionTitle}>{s.title}</span>
              <span className={styles.sessionMin}>{s.minutes} menit</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="paket-title" className={styles.block}>
        <div className={styles.blockHead}>
          <h2 id="paket-title" className={styles.blockTitle}>Paket soal</h2>
          <span className={styles.blockMeta}>
            {level.packages.length} dari {PACKAGE_TOTAL} tersedia
          </span>
        </div>

        <ul className={styles.packageCards}>
          {level.packages.map((p) => (
            <li key={p.no}>
              <Link
                href={`${BASE}?levelId=${level.levelId}&paket=${p.no}`}
                className={`${styles.packageCard} ${p.passed ? styles.packagePassed : ""}`}
                aria-label={`Paket ${p.no}, ${p.questionCount} soal, ${p.bestScore === null ? "belum dicoba" : `skor terbaik ${p.bestScore}`}`}
              >
                <span className={styles.packageTop}>
                  <span className={styles.packageNo}>{pad(p.no)}</span>
                  {p.passed && <TrophyIcon size={16} className={styles.trophy} />}
                </span>
                <span className={styles.packageLabel}>Paket</span>
                <span className={styles.packageMeta}>{p.questionCount} soal</span>
                <span className={styles.packageFoot}>
                  <span className={styles.packageScore}>
                    {p.bestScore === null ? "Belum dicoba" : <><strong>{p.bestScore}</strong>/{MAX_SCORE}</>}
                  </span>
                  <ScoreBar score={p.bestScore} pass={level.passScore} compact />
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`${BASE}?levelId=${level.levelId}&paket=acak`} className={`${styles.packageCard} ${styles.packageRandom}`}>
              <span className={styles.packageTop}>
                <ShuffleIcon size={22} className={styles.randomIcon} />
              </span>
              <span className={styles.packageLabel}>Paket acak</span>
              <span className={styles.packageMeta}>{level.questionCount} soal</span>
              <span className={styles.packageFoot}>
                <span className={styles.packageHint}>Soal berbeda setiap kali</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="riwayat-title" className={styles.block}>
        <div className={styles.blockHead}>
          <h2 id="riwayat-title" className={styles.blockTitle}>Riwayat</h2>
          {level.attempts > 0 && <span className={styles.blockMeta}>{level.attempts} percobaan</span>}
        </div>
        {level.recent.length > 0 && (
          <p className={styles.legend}>
            <span className={styles.legendMark} aria-hidden="true" /> Garis tegak pada bilah = batas lulus {level.passScore}. Skor hijau berarti lulus.
          </p>
        )}
        {level.recent.length === 0 ? (
          <p className={styles.emptyNote}>Belum ada percobaan. Mulai dari Paket 01 untuk mendapatkan skor pertamamu.</p>
        ) : (
          <>
            <ol className={styles.historyList}>
              {history.map((a) => {
                const passed = a.passed;
                return (
                  <li key={a.takenAt} className={styles.historyRow}>
                    <span className={styles.historyWhen}>
                      <span>{dateFmt.format(new Date(a.takenAt))}</span>
                      <span className={styles.historyPaket}>{a.paket ? `Paket ${a.paket}` : "Acak"}</span>
                    </span>
                    <ScoreBar score={a.score} pass={level.passScore} compact />
                    <span className={`${styles.historyScore} ${passed ? styles.textPass : styles.textFail}`}>
                      {a.score}
                      <span className="visually-hidden">{passed ? ", lulus" : ", belum lulus"}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {level.recent.length > HISTORY_SHOWN && (
              <button type="button" className={styles.moreBtn} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? "Tampilkan lebih sedikit" : `Tampilkan semua (${level.recent.length})`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
