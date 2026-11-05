"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { CircleCheckIcon, CircleXIcon, LockIcon, TimerIcon, TrophyIcon } from "@/shared/ui/icons";
import { examApi, type ExamStatus, type JlptSimLevel, type SubmitExamResponse } from "../data/examApi";
import { ExamRunner, MarkedText } from "./ExamRunner";
import runnerStyles from "./levelUpTest.module.css";
import styles from "./jlptSimulation.module.css";

/** Nama bagian mengikuti istilah kertas ujian JLPT. */
export const JLPT_SECTION_LABELS: Record<string, string> = {
  membaca: "Moji-Goi: Kanji Yomi",
  kosakata: "Moji-Goi: Kosakata",
  tata_bahasa: "Bunpou (Tata Bahasa)",
  dokkai: "Dokkai (Membaca)",
  mendengar: "Choukai (Mendengar)",
};

/** Tipe soal resmi (Daimon) untuk pembahasan. Sama dengan JLPT_CATEGORIES di server. */
const CATEGORY_LABELS: Record<string, string> = {
  kanji_yomi: "漢字読み Kanji Yomi",
  hyouki: "表記 Hyouki",
  gokeisei: "語形成 Gokeisei",
  bunmyaku: "文脈規定 Bunmyaku Kitei",
  iikae: "言い換え類義 Iikae Ruigi",
  youhou: "用法 Youhou",
  bunpou_keishiki: "文の文法1 Bun no Bunpou 1",
  narabikae: "文の文法2 ★ Narabikae",
  bunshou_bunpou: "文章の文法 Bunshou no Bunpou",
  dokkai_tanbun: "内容理解 短文",
  dokkai_chuubun: "内容理解 中文",
  dokkai_choubun: "内容理解 長文",
  dokkai_tougou: "統合理解",
  dokkai_jouhou: "情報検索",
  choukai_kadai: "課題理解",
  choukai_point: "ポイント理解",
  choukai_gaiyou: "概要理解",
  choukai_sokuji: "即時応答",
  choukai_tougou: "統合理解",
};

const SECTION_ORDER = ["membaca", "kosakata", "tata_bahasa", "dokkai", "mendengar"];
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

/** Simulasi JLPT: pilih level N5–N1, kerjakan sesi-sesi berwaktu seperti ujian asli, lalu lihat skor 0–180 dan pembahasan. */
export function JlptSimulation() {
  const params = useSearchParams();
  const levelId = Number(params.get("levelId"));
  if (Number.isInteger(levelId) && levelId > 0) return <SimulationRun levelId={levelId} />;
  return <LevelPicker />;
}

function LevelPicker() {
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

  return (
    <div className={styles.wrap}>
      <header className={styles.intro}>
        <span className={runnerStyles.readyBadge}>Simulasi JLPT</span>
        <h1 className={styles.title}>Coba ujian JLPT sebelum hari H</h1>
        <p className={styles.lead}>
          Susunannya mengikuti ujian resmi: beberapa sesi dengan waktu masing-masing, skor 0–180, dan nilai minimal tiap kelompok skor.
          Hasilnya tidak mengubah levelmu, jadi boleh diulang kapan saja.
        </p>
      </header>

      {failed ? (
        <p className={runnerStyles.errorBox} role="alert">Daftar simulasi belum bisa dimuat. Coba muat ulang halaman.</p>
      ) : !levels ? (
        <SkeletonRegion label="Memuat daftar level…" className={styles.grid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.card}>
              <Skeleton width="3rem" height="2rem" />
              <Skeleton width="70%" />
              <Skeleton height="2.5rem" radius="var(--radius-pill)" />
            </div>
          ))}
        </SkeletonRegion>
      ) : (
        <ul className={styles.grid}>
          {levels.map((l) => (
            <li key={l.levelId} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.code}>{l.code}</span>
                {l.passedCount > 0 && (
                  <span className={styles.passedTag}>
                    <TrophyIcon size={13} /> Pernah lulus
                  </span>
                )}
              </div>
              <p className={styles.meta}>
                {l.questionCount} soal · <TimerIcon size={13} /> {l.timeLimitMin} menit · lulus {l.passScore}/180
              </p>
              <ol className={styles.sessionList} aria-label={`Sesi ${l.code}`}>
                {l.sessions.map((s) => (
                  <li key={s.key}>
                    <span>{s.title}</span>
                    <span className={styles.sessionMin}>{s.minutes} mnt</span>
                  </li>
                ))}
              </ol>
              <p className={styles.best}>
                {l.bestScore === null ? "Belum pernah dicoba" : `Skor terbaik ${l.bestScore}/180 dari ${l.attempts} percobaan`}
              </p>
              {l.recent.length > 0 && (
                <ol className={styles.history} aria-label={`Riwayat simulasi ${l.code}`}>
                  {l.recent.map((a) => (
                    <li key={a.takenAt} className={a.passed ? styles.historyPass : styles.historyFail}>
                      <span>{dateFmt.format(new Date(a.takenAt))}</span>
                      <strong>{a.score}</strong>
                      <span className="visually-hidden">{a.passed ? "lulus" : "belum lulus"}</span>
                    </li>
                  ))}
                </ol>
              )}
              {l.available ? (
                <Link href={`/belajar/simulasi-jlpt?levelId=${l.levelId}`} className={styles.startLink}>
                  Mulai simulasi {l.code}
                </Link>
              ) : (
                <p className={styles.unavailable}>
                  <LockIcon size={14} /> Bank soal {l.code} belum tersedia
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link href="/belajar" className={runnerStyles.backLink}>← Kembali ke Belajar</Link>
    </div>
  );
}

function SimulationRules({ status }: { status: ExamStatus }) {
  const j = status.jlpt;
  if (!j) return null;
  return (
    <div className={styles.rules}>
      <div>
        <h2 className={styles.rulesTitle}>Sesi ujian</h2>
        <ol className={styles.rulesList}>
          {j.sessions.map((s, i) => (
            <li key={s.key}>
              <span>
                {i + 1}. {s.title}
              </span>
              <span className={styles.rulesValue}>
                {s.questionCount} soal · {s.minutes} menit
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.rulesNote}>
          Tiap sesi punya waktu sendiri dan jawabannya dikunci saat sesi selesai. Di antara sesi ada istirahat maksimal {j.breakMinutes} menit.
        </p>
      </div>
      <div>
        <h2 className={styles.rulesTitle}>Syarat lulus</h2>
        <ul className={styles.rulesList}>
          <li>
            <span>Skor total</span>
            <span className={styles.rulesValue}>
              minimal {j.pass}/{j.maxScore}
            </span>
          </li>
          {j.groups.map((g) => (
            <li key={g.key}>
              <span>{g.label}</span>
              <span className={styles.rulesValue}>
                minimal {g.min}/{g.max}
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.rulesNote}>Skor total cukup tapi satu kelompok di bawah minimalnya tetap dinyatakan tidak lulus, seperti JLPT asli.</p>
      </div>
    </div>
  );
}

function SimulationScore({ result }: { result: SubmitExamResponse }) {
  const sim = result.simulation;
  if (!sim) return null;
  const totalShort = sim.scaledScore < sim.pass;
  return (
    <div className={styles.scoreBlock}>
      <p className={`${styles.totalScore} ${result.passed ? styles.totalPass : styles.totalFail}`}>
        <strong>{sim.scaledScore}</strong>
        <span>/{sim.maxScore}</span>
      </p>
      <p className={styles.totalNote}>
        {result.passed
          ? "Skor total dan semua kelompok memenuhi syarat lulus JLPT."
          : result.late
            ? "Jawaban terkirim melewati batas waktu, jadi belum bisa dinyatakan lulus."
            : totalShort
              ? `Batas lulus ${sim.pass}/${sim.maxScore}. Kurang ${sim.pass - sim.scaledScore} poin lagi.`
              : "Skor total sudah cukup, tapi ada kelompok di bawah nilai minimalnya."}
      </p>

      <div className={runnerStyles.sectionBars}>
        <h3 className={runnerStyles.sectionTitle}>Skor per kelompok</h3>
        {sim.groups.map((g) => (
          <div key={g.key} className={runnerStyles.sectionRow}>
            <span className={runnerStyles.sectionName}>
              {g.label} <small>{g.empty ? "(belum ada soal)" : `(min. ${g.min})`}</small>
            </span>
            <div className={runnerStyles.sectionBar}>
              <div
                className={`${runnerStyles.sectionBarFill} ${g.passed ? runnerStyles.sectionBarPass : runnerStyles.sectionBarFail}`}
                style={{ width: `${(g.scaled / g.max) * 100}%` }}
              />
            </div>
            <span className={`${runnerStyles.sectionScore} ${g.passed ? runnerStyles.sectionScorePass : runnerStyles.sectionScoreFail}`}>
              {g.empty ? "–" : `${g.scaled}/${g.max}`}
            </span>
          </div>
        ))}
      </div>
      {sim.partial && (
        <p className={styles.partialNote}>
          Bank soal level ini belum punya soal untuk semua kelompok, jadi skor total dihitung dari kelompok yang ada.
        </p>
      )}
    </div>
  );
}

function SimulationRun({ levelId }: { levelId: number }) {
  return (
    <ExamRunner
      kind="jlpt-sim"
      levelId={levelId}
      sectionLabels={JLPT_SECTION_LABELS}
      retryAfterPass
      wide
      copy={{
        badge: "Simulasi JLPT",
        title: "Siap mencoba simulasi JLPT?",
        desc: "Kerjakan seperti hari ujian: siapkan waktu tanpa gangguan dan headphone untuk sesi Choukai.",
        passedTitle: "Lulus simulasi!",
        passedDesc: "",
      }}
      backHref="/belajar/simulasi-jlpt"
      backLabel="Pilih level lain"
      rules={(status) => <SimulationRules status={status} />}
      resultBody={(result) => <SimulationScore result={result} />}
      resultExtra={(result) => <SimulationReview result={result} />}
      resultActions={(_result, retry) => (
        <>
          <Link href="/belajar/simulasi-jlpt" className={runnerStyles.startBtn}>Pilih level lain</Link>
          {retry && <button className={runnerStyles.retryBtn} onClick={retry}>Ulangi simulasi</button>}
        </>
      )}
    />
  );
}

function SimulationReview({ result }: { result: SubmitExamResponse }) {
  const { updateUser } = useAuth();
  const [onlyWrong, setOnlyWrong] = useState(true);

  // Streak dan XP di header ikut diperbarui sekali per hasil
  useEffect(() => {
    if (result.progress) updateUser({ xpTotal: result.progress.xpTotal, streakCount: result.progress.streak });
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const sim = result.simulation;
  if (!sim) return null;
  const wrongCount = sim.review.filter((r) => !r.correct && !r.skipped).length;
  const groups = SECTION_ORDER.map((section) => {
    const all = sim.review.filter((r) => r.section === section);
    const wrong = all.filter((r) => !r.correct && !r.skipped);
    return { section, all, wrong, shown: onlyWrong ? wrong : all };
  }).filter((g) => g.all.length > 0);
  // Bagian dengan kesalahan terbanyak dibuka lebih dulu, sisanya dilipat supaya halaman tidak memanjang
  const worst = [...groups].sort((a, b) => b.wrong.length - a.wrong.length)[0]?.section;

  return (
    <section className={styles.review} aria-labelledby="pembahasan-title">
      <div className={styles.reviewHead}>
        <h3 id="pembahasan-title" className={runnerStyles.sectionTitle}>Pembahasan</h3>
        <label className={styles.toggle}>
          <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
          Hanya yang salah ({wrongCount})
        </label>
      </div>

      {onlyWrong && wrongCount === 0 ? (
        <p className={styles.allRight}>Semua jawaban benar. Hebat!</p>
      ) : (
        groups.map((g) => (
          <details key={g.section} className={styles.group} open={g.section === worst && g.wrong.length > 0}>
            <summary className={styles.groupSummary}>
              <span className={styles.groupName}>{JLPT_SECTION_LABELS[g.section] ?? g.section}</span>
              <span className={g.wrong.length ? styles.groupCountBad : styles.groupCountGood}>
                {g.all.length - g.wrong.length}/{g.all.length} benar
              </span>
            </summary>
            {g.shown.length === 0 ? (
              <p className={styles.groupEmpty}>Tidak ada jawaban salah di bagian ini.</p>
            ) : (
              <ol className={styles.reviewList}>
                {g.shown.map((r) => (
                  <li key={r.questionId} className={styles.reviewItem}>
                    {r.category && <span className={styles.category}>{CATEGORY_LABELS[r.category] ?? r.category}</span>}
                    {r.passage && (
                      <details className={styles.passageReview}>
                        <summary>{r.section === "mendengar" ? "Lihat skrip percakapan" : "Lihat teks bacaan"}</summary>
                        <p lang="ja">{r.passage}</p>
                      </details>
                    )}
                    <p className={styles.reviewQuestion} lang="ja">
                      <MarkedText text={r.question} />
                    </p>
                    <dl className={styles.answers}>
                      <div className={r.correct ? styles.answerRight : styles.answerWrong}>
                        <dt>
                          {r.correct ? <CircleCheckIcon size={15} /> : <CircleXIcon size={15} />}
                          Jawabanmu
                        </dt>
                        <dd lang="ja">{r.skipped ? "dilewati" : r.given || "tidak dijawab"}</dd>
                      </div>
                      {!r.correct && (
                        <div className={styles.answerKey}>
                          <dt>
                            <CircleCheckIcon size={15} />
                            Jawaban benar
                          </dt>
                          <dd lang="ja">{r.correctAnswer}</dd>
                        </div>
                      )}
                    </dl>
                    {r.explanation && <p className={styles.explanation}>{r.explanation}</p>}
                  </li>
                ))}
              </ol>
            )}
          </details>
        ))
      )}
    </section>
  );
}
