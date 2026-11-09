"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { CircleCheckIcon, CircleXIcon } from "@/shared/ui/icons";
import type { ExamStatus, SubmitExamResponse } from "../data/examApi";
import { MarkedText } from "./MarkedText";
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

/** Tipe soal resmi (Daimon): nama Jepang di kertas ujian dan keterangan singkat. Sama dengan JLPT_CATEGORIES di server. */
export const JLPT_DAIMON: Record<string, { ja: string; id: string }> = {
  kanji_yomi: { ja: "漢字読み", id: "Cara baca kanji" },
  hyouki: { ja: "表記", id: "Penulisan kanji/katakana" },
  gokeisei: { ja: "語形成", id: "Pembentukan kata" },
  bunmyaku: { ja: "文脈規定", id: "Kata sesuai konteks" },
  iikae: { ja: "言い換え類義", id: "Padanan makna" },
  youhou: { ja: "用法", id: "Penggunaan kata" },
  bunpou_keishiki: { ja: "文の文法1", id: "Pola tata bahasa" },
  narabikae: { ja: "文の文法2", id: "Menyusun kalimat ★" },
  bunshou_bunpou: { ja: "文章の文法", id: "Tata bahasa wacana" },
  dokkai_tanbun: { ja: "内容理解（短文）", id: "Wacana pendek" },
  dokkai_chuubun: { ja: "内容理解（中文）", id: "Wacana menengah" },
  dokkai_choubun: { ja: "内容理解（長文）", id: "Wacana panjang" },
  dokkai_tougou: { ja: "統合理解", id: "Membandingkan dua teks" },
  dokkai_jouhou: { ja: "情報検索", id: "Mencari informasi" },
  choukai_kadai: { ja: "課題理解", id: "Tugas berikutnya" },
  choukai_point: { ja: "ポイント理解", id: "Poin tertentu" },
  choukai_gaiyou: { ja: "概要理解", id: "Ide utama" },
  choukai_sokuji: { ja: "即時応答", id: "Respons cepat" },
  choukai_tougou: { ja: "統合理解", id: "Percakapan panjang" },
};

const SECTION_ORDER = ["membaca", "kosakata", "tata_bahasa", "dokkai", "mendengar"];

export function SimulationRules({ status }: { status: ExamStatus }) {
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
          Dalam satu sesi kamu boleh kembali ke soal sebelumnya, mengganti jawaban, dan menandai soal yang masih ragu. Jawaban dikunci saat
          sesi selesai atau waktunya habis. Di antara sesi ada istirahat maksimal {j.breakMinutes} menit.
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

export function SimulationScore({ result }: { result: SubmitExamResponse }) {
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

export function SimulationReview({ result }: { result: SubmitExamResponse }) {
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
                    {r.category && JLPT_DAIMON[r.category] && (
                      <span className={styles.category}>
                        <span lang="ja">{JLPT_DAIMON[r.category].ja}</span> · {JLPT_DAIMON[r.category].id}
                      </span>
                    )}
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
