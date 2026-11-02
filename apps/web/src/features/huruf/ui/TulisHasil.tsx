"use client";

import type { Box, CharResult, CheckMark, CheckResult, Dimension, DimensionScores, NekoFeedback, Quadrant } from "../data/tulisApi";
import styles from "./tulisHasil.module.css";

/** Foto yang diperiksa beserta ukuran aslinya (untuk mengubah koordinat 0–1000 ke piksel). */
export interface CheckedPhoto {
  src: string;
  width: number;
  height: number;
}

const GRADES: Record<CheckResult["grade"], { stamp: string; title: string; lines: string[] }> = {
  S: {
    stamp: "はなまる",
    title: "Sempurna!",
    lines: ["Tulisanmu rapi sekali, seperti contoh di buku pelajaran. Lanjut ke lembar berikutnya!", "Tanganmu sudah hafal bentuknya. Kamu siap menantang huruf baru!"],
  },
  A: {
    stamp: "よくできました",
    title: "Hebat!",
    lines: ["Tinggal sedikit lagi menuju はなまる. Perbaiki kotak yang ditandai, pasti bisa!", "Hampir semua sudah rapi. Satu lembar lagi dan kamu sempurna!"],
  },
  B: {
    stamp: "いいね",
    title: "Bagus!",
    lines: ["Bentuk dasarnya sudah benar. Latih lagi huruf yang ditandai, pelan-pelan saja.", "Kemajuanmu kelihatan! Fokus ke catatan di bawah, lalu foto lagi."],
  },
  C: {
    stamp: "もう少し",
    title: "Sedikit lagi!",
    lines: ["Setiap kotak yang kamu tulis membuat tanganmu makin hafal. Ayo coba sekali lagi!", "Jangan menyerah, perbaiki satu huruf dulu, lalu lanjut ke yang lain."],
  },
  D: {
    stamp: "がんばろう",
    title: "Ayo semangat!",
    lines: ["Semua ahli dulu juga pemula. Mulai lagi dari menebalkan huruf abu-abu, pelan-pelan saja.", "Lihat contoh dan urutan goresannya dulu, lalu tulis perlahan. Miu-chan menemanimu!"],
  },
};

const KIND_LABEL: Record<CheckMark["kind"], string> = { salah: "Huruf salah", kurang: "Kurang rapi", kosong: "Belum diisi" };

type NumberedMark = CheckMark & { n: number };

/** Rubrik 5 dimensi dengan bobotnya (sama dengan server). */
const DIMENSIONS: { key: keyof DimensionScores; dim: Dimension; label: string; weight: number }[] = [
  { key: "strokeCountScore", dim: "strokeCount", label: "Kelengkapan goresan", weight: 30 },
  { key: "proportionScore", dim: "proportion", label: "Proporsi & keseimbangan", weight: 25 },
  { key: "strokeEndingScore", dim: "strokeEnding", label: "Akhiran goresan", weight: 20 },
  { key: "centerAlignmentScore", dim: "centerAlignment", label: "Posisi di tengah kotak", weight: 15 },
  { key: "legibilityScore", dim: "legibility", label: "Kerapian garis", weight: 10 },
];

const QUADRANT_NAME: Record<Quadrant, string> = { kiri_atas: "kiri atas", kanan_atas: "kanan atas", kiri_bawah: "kiri bawah", kanan_bawah: "kanan bawah", tengah: "tengah" };

/** Wajah Miu-chan per emosi umpan balik. */
const FACE: Record<NekoFeedback["emotionState"], string> = {
  happy: "/neko/base-senang.webp",
  thinking: "/neko/base-berpikir.webp",
  encouraging: "/neko/base-semangat.webp",
  surprised: "/neko/base-kaget.webp",
};

const ANGLE_LABEL: Record<NekoFeedback["angle"], string> = { langsung: "Penjelasan langsung", analogi: "Penjelasan dengan perumpamaan", langkah: "Panduan langkah demi langkah" };

const tone = (score: number) => (score >= 80 ? "good" : score >= 60 ? "ok" : "low");

/** Foto (utuh atau dipotong ke satu baris) dengan tanda koreksi di atasnya. */
function MarkedPhoto({ photo, view, marks, best, label }: { photo: CheckedPhoto; view: Box | null; marks: NumberedMark[]; best: Box[]; label: string }) {
  const { width: W, height: H } = photo;
  const px = (b: Box) => ({ x: (b[1] / 1000) * W, y: (b[0] / 1000) * H, w: ((b[3] - b[1]) / 1000) * W, h: ((b[2] - b[0]) / 1000) * H });
  let vx = 0;
  let vy = 0;
  let vw = W;
  let vh = H;
  if (view) {
    const v = px(view);
    const pad = Math.max(v.h * 0.12, 6);
    vx = Math.max(0, v.x - pad);
    vy = Math.max(0, v.y - pad);
    vw = Math.min(W, v.x + v.w + pad) - vx;
    vh = Math.min(H, v.y + v.h + pad) - vy;
  }
  const r = Math.min(vw * 0.032, vh * 0.13);

  return (
    <svg className={styles.photo} viewBox={`${vx} ${vy} ${vw} ${vh}`} role="img" aria-label={label}>
      <image href={photo.src} x={0} y={0} width={W} height={H} />
      {best.map((b, i) => {
        const p = px(b);
        return (
          <g key={`b${i}`} className={styles.markBest}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={r * 0.4} vectorEffect="non-scaling-stroke" />
            <circle cx={p.x + p.w} cy={p.y} r={r} />
            <text x={p.x + p.w} y={p.y} fontSize={r * 1.25}>
              ✓
            </text>
          </g>
        );
      })}
      {marks.map((m) => {
        if (!m.focus) return null;
        const f = px(m.focus);
        return <rect key={`f${m.n}`} className={styles.focus} data-severity={m.severity} x={f.x} y={f.y} width={f.w} height={f.h} rx={r * 0.25} />;
      })}
      {marks.map((m) => {
        const p = px(m.box);
        return (
          <g key={m.n} className={styles.mark} data-kind={m.kind} data-severity={m.severity}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={r * 0.4} vectorEffect="non-scaling-stroke" />
            {m.kind === "salah" && <path d={`M${p.x + p.w * 0.18} ${p.y + p.h * 0.18}L${p.x + p.w * 0.82} ${p.y + p.h * 0.82}`} vectorEffect="non-scaling-stroke" />}
            <circle cx={p.x + p.w} cy={p.y} r={r} />
            <text x={p.x + p.w} y={p.y} fontSize={r * 1.2}>
              {m.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Umpan balik Miu-chan: wajah sesuai emosi, judul, penjelasan, dan saran. */
function Neko({ feedback }: { feedback: NekoFeedback }) {
  return (
    <div className={styles.neko} data-severity={feedback.severity}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FACE[feedback.emotionState]} alt="" className={styles.nekoFace} />
      <div className={styles.nekoBody}>
        <p className={styles.nekoHeadline}>{feedback.headlineText}</p>
        <p className={styles.nekoText}>{feedback.detailedExplanation}</p>
        <p className={styles.nekoTip}>
          <span aria-hidden="true">💡</span> {feedback.actionableTip}
        </p>
        {feedback.attempt > 1 && (
          <p className={styles.nekoAngle}>
            {ANGLE_LABEL[feedback.angle]} · percobaan ke-{feedback.attempt}
          </p>
        )}
      </div>
    </div>
  );
}

/** Rubrik 5 dimensi: batang nilai per dimensi beserta bobotnya. */
function Rubric({ scores, marks }: { scores: DimensionScores; marks: NumberedMark[] }) {
  const flagged = new Set(marks.map((m) => m.dimension).filter(Boolean));
  return (
    <details className={styles.rubric}>
      <summary>Rincian nilai (5 aspek)</summary>
      <ul>
        {DIMENSIONS.map((d) => (
          <li key={d.key} data-tone={tone(scores[d.key])} data-flagged={flagged.has(d.dim) || undefined}>
            <span className={styles.rubricLabel}>
              {d.label} <small>{d.weight}%</small>
            </span>
            <span className={styles.bar} aria-hidden="true">
              <span style={{ width: `${scores[d.key]}%` }} />
            </span>
            <b>{scores[d.key]}</b>
          </li>
        ))}
      </ul>
    </details>
  );
}

function CharCard({ c, photo, marks }: { c: CharResult; photo: CheckedPhoto; marks: NumberedMark[] }) {
  return (
    <li className={styles.card} data-tone={tone(c.score)}>
      <div className={styles.cardHead}>
        <div className={styles.cardChar} lang="ja">
          <span>{c.char}</span>
          <small>{c.reading}</small>
        </div>
        <div className={styles.cardStats}>
          <div className={styles.cardScoreLine}>
            <strong className={styles.cardScore}>{c.score}</strong>
            <span className={styles.muted}>/100</span>
            {c.written > 0 && (
              <span className={styles.pass} data-pass={c.isPass || undefined}>
                {c.isPass ? "Lulus" : "Belum lulus"}
              </span>
            )}
            <span className={styles.cardNeat}>
              {c.written ? `${c.neat} dari ${c.written} kotak rapi` : "Belum ditulis"}
            </span>
          </div>
          <div className={styles.bar} aria-hidden="true">
            <span style={{ width: `${c.score}%` }} />
          </div>
        </div>
      </div>

      {c.row && <MarkedPhoto photo={photo} view={c.row} marks={marks} best={c.best ? [c.best] : []} label={`Tulisanmu untuk ${c.char}`} />}

      {c.written > 0 && <Neko feedback={c.nekoFeedback} />}

      {marks.length > 0 && (
        <ul className={styles.issues}>
          {marks.map((m) => (
            <li key={m.n} className={styles.issue} data-kind={m.kind} data-severity={m.severity}>
              <span className={styles.issueNum}>{m.n}</span>
              <div>
                <span className={styles.issueKind}>
                  {KIND_LABEL[m.kind]} · kotak {m.cell}
                  {m.quadrant && m.quadrant !== "tengah" && <> · bagian {QUADRANT_NAME[m.quadrant]}</>}
                  {m.kind === "salah" && m.read && (
                    <>
                      {" "}
                      · terbaca <b lang="ja">{m.read}</b>, seharusnya <b lang="ja">{c.char}</b>
                    </>
                  )}
                </span>
                <span className={styles.issueText}>{m.problem}</span>
                {m.fix && (
                  <span className={styles.issueFix}>
                    <b>Cara memperbaiki:</b> {m.fix}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {c.written > 0 && <Rubric scores={c.dimensionScores} marks={marks} />}
    </li>
  );
}

export function TulisHasil({ result, photo }: { result: CheckResult; photo: CheckedPhoto }) {
  const grade = GRADES[result.grade];
  const line = grade.lines[result.score % grade.lines.length];

  let n = 0;
  const numbered = result.chars.map((c) => c.marks.map((m): NumberedMark => ({ ...m, n: ++n })));
  const allMarks = numbered.flat();
  const written = result.chars.reduce((s, c) => s + c.written, 0);
  const neat = result.chars.reduce((s, c) => s + c.neat, 0);
  const wrong = allMarks.filter((m) => m.kind === "salah").length;
  const focus = result.chars.filter((c) => c.score < 80).sort((a, b) => a.score - b.score);

  return (
    <div className={styles.wrap}>
      <section className={styles.report} data-grade={result.grade} aria-label="Nilai tulisan">
        <div className={styles.stamp}>
          <span className={styles.stampGrade}>{result.grade}</span>
          <span className={styles.stampText} lang="ja">
            {grade.stamp}
          </span>
        </div>
        <div className={styles.reportBody}>
          <p className={styles.reportTitle}>{grade.title}</p>
          <p className={styles.reportScore}>
            <strong>{result.score}</strong>
            <span>/100</span>
          </p>
          <div className={styles.bar} aria-hidden="true">
            <span style={{ width: `${result.score}%` }} />
          </div>
          <p className={styles.reportLine}>{line}</p>
          <p className={styles.scoreRule}>
            Nilai dari 5 aspek: kelengkapan goresan 30%, proporsi 25%, akhiran goresan 20%, posisi di tengah 15%, kerapian 10%. Huruf salah atau
            kotak kosong bernilai 0. {result.isPass ? "Lulus (≥ 70) ✓" : "Belum lulus (perlu ≥ 70)"}
          </p>
          <ul className={styles.chips}>
            <li>
              <b>{neat}</b>/{written} kotak rapi
            </li>
            <li data-tone={wrong ? "low" : "good"}>
              <b>{wrong}</b> huruf salah
            </li>
            <li data-tone={allMarks.length - wrong ? "ok" : "good"}>
              <b>{allMarks.length - wrong}</b> perlu dirapikan
            </li>
          </ul>
        </div>
      </section>

      {!result.precise && (
        <p className={styles.approx}>
          Lembar ini tidak punya penanda hitam di sudut (lembar lama atau salinan di buku), jadi posisi tanda bisa sedikit meleset dan
          kotak kosong tidak dihitung. Untuk koreksi paling tepat, cetak lembar terbaru dari halaman ini.
        </p>
      )}

      {result.summary && (
        <div className={styles.miu}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neko/chibi/neko-chibi.webp" alt="" />
          <p className={styles.miuBubble}>
            <b>Miu-chan:</b> {result.summary}
          </p>
        </div>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tanda koreksi di fotomu</h3>
        <MarkedPhoto photo={photo} view={null} marks={allMarks} best={result.chars.flatMap((c) => (c.best ? [c.best] : []))} label="Foto lembar dengan tanda koreksi" />
        <ul className={styles.legend}>
          <li data-kind="best">
            <i /> Tulisan terbaik
          </li>
          <li data-kind="salah">
            <i /> Huruf salah
          </li>
          <li data-kind="kurang">
            <i /> Kurang rapi
          </li>
          <li data-kind="kosong">
            <i /> Belum diisi
          </li>
          <li data-kind="focus">
            <i /> Bagian yang perlu dibenahi
          </li>
        </ul>
        {allMarks.length === 0 && <p className={styles.allGood}>Tidak ada kotak yang perlu diperbaiki. すばらしい！</p>}
      </section>

      {focus.length > 0 && (
        <section className={styles.focus}>
          <h3 className={styles.sectionTitle}>Fokus latihan berikutnya</h3>
          <p className={styles.muted}>Tulis ulang huruf ini di kotak kosong atau di buku, lalu foto lagi untuk melihat kemajuanmu.</p>
          <div className={styles.focusChars} lang="ja">
            {focus.map((c) => (
              <span key={c.char} data-tone={tone(c.score)}>
                {c.char}
                <small>{c.score}</small>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Koreksi per huruf</h3>
        <ul className={styles.cards}>
          {result.chars.map((c, i) => (
            <CharCard key={c.char} c={c} photo={photo} marks={numbered[i]} />
          ))}
        </ul>
      </section>
    </div>
  );
}
