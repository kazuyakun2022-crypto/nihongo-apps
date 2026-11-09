"use client";

import Link from "next/link";
import { ApiError } from "@/core/http/apiClient";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HIRAGANA_BASIC, KANJI_N5, KATAKANA_BASIC } from "../data/characters";
import { HIRAGANA_STROKE_DATA } from "../data/hiraganaStrokes";
import { periksaTulisan, type CheckResult } from "../data/tulisApi";
import { SheetScanner, type ScanResult } from "./SheetScanner";
import { TulisHasil, type CheckedPhoto } from "./TulisHasil";
import styles from "./tulisBuku.module.css";
import { CameraIcon, CheckIcon, PencilIcon, PrinterIcon, StarIcon } from "@/shared/ui/icons";

/**
 * Latihan menulis di buku fisik: pilih lembar → cetak/salin ke buku → foto → periksa.
 * Foto diperiksa server (Gemini): kotak yang salah/kurang rapi ditandai di foto, lalu diberi nilai per huruf.
 */

export interface Sheet {
  id: string;
  script: "hiragana" | "katakana" | "kanji";
  title: string;
  chars: { char: string; reading: string; strokes?: number; meaning?: string }[];
}

/**
 * Lembar ujian Gerbang Tulis: kisi dan penanda sama persis dengan lembar latihan (pemindai & server tidak berubah),
 * tetapi kotak contoh hanya mencetak bacaan + arti dan tidak ada huruf abu-abu, karena huruf ditulis dari ingatan.
 */
export interface ExamPrint {
  levelCode: string;
  index: number;
  total: number;
  requiredWrites: number;
}

/** Lembar cetak A4 lebih lebar: 1 contoh + 9 kotak (3 untuk menebalkan), lalu satu baris "sekali lagi". */
const PRINT_BOXES = 9;
const PRINT_TRACE = 3;

/** Peribahasa penyemangat di kaki lembar cetak; dipilih dari id lembar supaya tiap lembar berbeda. */
const PROVERBS = [
  { ja: "継続は力なり", id: "Berlatih sedikit setiap hari lama-lama jadi kekuatan." },
  { ja: "千里の道も一歩から", id: "Perjalanan seribu mil dimulai dari satu langkah." },
  { ja: "七転び八起き", id: "Jatuh tujuh kali, bangkit delapan kali." },
  { ja: "塵も積もれば山となる", id: "Sedikit demi sedikit, lama-lama menjadi bukit." },
  { ja: "習うより慣れろ", id: "Makin sering ditulis, makin lancar tanganmu." },
];

/** 5 kanji per lembar: tata letaknya sama dengan lembar kana sehingga muat satu halaman bersama penanda sudut. */
const KANJI_PER_SHEET = 5;

const SCRIPT_JA: Record<Sheet["script"], string> = { hiragana: "ひらがな", katakana: "カタカナ", kanji: "かんじ" };

const ROW_NAMES: Record<string, string> = { "∅": "a", K: "ka", S: "sa", T: "ta", N: "na", H: "ha", M: "ma", Y: "ya", R: "ra", W: "wa", "N'": "n" };

function buildSheets(): Sheet[] {
  const hiraganaRows = new Map<string, Sheet["chars"]>();
  for (const h of HIRAGANA_BASIC) {
    const key = h.row === "N'" ? "W" : h.row; // ん digabung ke baris wa
    hiraganaRows.set(key, [...(hiraganaRows.get(key) ?? []), { char: h.char, reading: h.romaji, strokes: HIRAGANA_STROKE_DATA[h.char]?.strokeCount }]);
  }
  const rowOf = new Map(HIRAGANA_BASIC.map((h) => [h.char, h.row === "N'" ? "W" : h.row]));
  const katakanaRows = new Map<string, Sheet["chars"]>();
  for (const k of KATAKANA_BASIC) {
    const key = rowOf.get(k.hiragana) ?? "∅";
    katakanaRows.set(key, [...(katakanaRows.get(key) ?? []), { char: k.char, reading: k.romaji }]);
  }
  const sheets: Sheet[] = [];
  for (const [row, chars] of hiraganaRows) sheets.push({ id: `h-${row}`, script: "hiragana", title: `Baris ${ROW_NAMES[row] ?? row}`, chars });
  for (const [row, chars] of katakanaRows) sheets.push({ id: `k-${row}`, script: "katakana", title: `Baris ${ROW_NAMES[row] ?? row}`, chars });
  for (let i = 0; i < KANJI_N5.length; i += KANJI_PER_SHEET) {
    const group = KANJI_N5.slice(i, i + KANJI_PER_SHEET);
    sheets.push({
      id: `j-${i / KANJI_PER_SHEET + 1}`,
      script: "kanji",
      title: `Set ${i / KANJI_PER_SHEET + 1}`,
      // Arti pertama saja ("matahari, hari" → "matahari") supaya muat di kotak contoh
      chars: group.map((k) => ({ char: k.character, reading: (k.meaningId ?? k.kunyomi).split(",")[0].trim(), strokes: k.strokeCount })),
    });
  }
  return sheets;
}

const SCRIPT_LABEL: Record<Sheet["script"], string> = { hiragana: "Hiragana", katakana: "Katakana", kanji: "Kanji N5" };
const SCRIPT_JA_LABEL: Record<Sheet["script"], string> = { hiragana: "Hiragana", katakana: "Katakana", kanji: "Kanji" };

type Step = "pilih" | "pindai" | "periksa" | "hasil";

/** Nilai terakhir tiap lembar, disimpan di perangkat ini (penyemangat, bukan data penting). */
const PROGRESS_KEY = "tulis-buku-progress";
type Progress = Record<string, { score: number; grade: string; at: number }>;

function readProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") as Progress;
  } catch {
    return {};
  }
}

function saveProgress(id: string, score: number, grade: string): Progress {
  const next = { ...readProgress(), [id]: { score, grade, at: Date.now() } };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan diblokir (mode privat): tidak masalah
  }
  return next;
}

/** Pratinjau lembar di layar, susunannya sama dengan lembar cetak. */
function MiniSheet({ sheet }: { sheet: Sheet }) {
  return (
    <div className={styles.mini} lang="ja" aria-label={`Pratinjau lembar ${sheet.title}`}>
      {sheet.chars.map((c) => (
        <div key={c.char} className={styles.miniChar}>
          <div className={styles.miniRow}>
            <span className={styles.miniModel}>
              {c.char}
              <small>{c.reading}</small>
            </span>
            {Array.from({ length: PRINT_BOXES }, (_, i) => (
              <span key={i} className={styles.miniBox} data-trace={i < PRINT_TRACE || undefined}>
                {i < PRINT_TRACE ? c.char : ""}
              </span>
            ))}
          </div>
          <div className={styles.miniRow}>
            <span className={styles.miniAgain}>
              もう
              <br />
              一回
            </span>
            {Array.from({ length: PRINT_BOXES }, (_, i) => (
              <span key={i} className={styles.miniBox} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stepper({ index }: { index: number }) {
  const labels = ["Pilih lembar", "Foto tulisan", "Koreksi"];
  return (
    <ol className={styles.stepper} aria-label="Langkah">
      {labels.map((label, i) => (
        <li key={label} data-state={i < index ? "done" : i === index ? "active" : "todo"} aria-current={i === index ? "step" : undefined}>
          <span className={styles.stepBar} />
          <span className={styles.stepLabel}>
            <b>{i < index ? <CheckIcon size={11} strokeWidth={3.2} /> : i + 1}</b> {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Tahap pemeriksaan (perkiraan waktu; pemeriksaan sungguhan berjalan di server). */
const CHECK_STAGES = [
  "Kotak-kotak ditemukan",
  "Tahap 1: tiga penilai membaca semua kotak",
  "Tahap 2: memeriksa ulang kotak yang dicurigai",
  "Menyusun nilai dan catatan",
];

/** Lembar A4 untuk dicetak: dekoratif tapi tetap jelas di printer hitam-putih. */
function PrintWorksheet({ sheet, exam }: { sheet: Sheet; exam?: ExamPrint }) {
  const seed = [...sheet.id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const proverb = PROVERBS[seed % PROVERBS.length];
  const subtitle = exam ? `${exam.levelCode}　しけん ${exam.index + 1}/${exam.total}` : sheet.script === "kanji" ? `N5 · ${sheet.title}` : `${sheet.chars[0].char}行`;
  const trace = exam ? 0 : PRINT_TRACE;
  return (
    <div className={styles.printSheet} data-print-sheet data-dense={sheet.chars.length > 5 || undefined}>
      <header className={styles.pHead}>
        <div className={styles.pHeadText}>
          <p className={styles.pEyebrow}>
            {exam ? (
              <>
                <span lang="ja">しけん</span> · Gerbang Tulis
              </>
            ) : (
              <>
                <span lang="ja">れんしゅうちょう</span> · Lembar Latihan Menulis
              </>
            )}
          </p>
          <h1 className={styles.pTitle}>
            {exam ? `${SCRIPT_JA_LABEL[sheet.script]} · Lembar ${exam.index + 1} dari ${exam.total}` : `${SCRIPT_LABEL[sheet.script]} · ${sheet.title}`}
          </h1>
          <p className={styles.pSubtitle} lang="ja">
            {SCRIPT_JA[sheet.script]}　{subtitle}
          </p>
          <div className={styles.pFields}>
            <span>
              Nama <i />
            </span>
            <span>
              Tanggal <i />
            </span>
          </div>
        </div>
        <div className={styles.pMascot}>
          <p className={styles.pBubble}>
            <span lang="ja">がんばってね！</span>
            Kamu pasti bisa!
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neko/chibi/neko-chibi.webp" alt="" />
        </div>
      </header>

      {exam ? (
        <ol className={styles.pSteps}>
          <li>
            <b>1</b> Baca bacaan &amp; arti di kotak merah
          </li>
          <li>
            <b>2</b> Tulis hurufnya {exam.requiredWrites}× di kotak 1–{exam.requiredWrites} baris atas
          </li>
          <li>
            <b>3</b> Dari ingatan, tanpa melihat contoh
          </li>
          <li>
            <b><StarIcon size={11} strokeWidth={1.8} /></b> Foto lembar ini di aplikasi
          </li>
        </ol>
      ) : (
        <ol className={styles.pSteps}>
          <li>
            <b>1</b> Lihat contoh &amp; urutan goresan
          </li>
          <li>
            <b>2</b> Tebalkan huruf abu-abu
          </li>
          <li>
            <b>3</b> Tulis sendiri di kotak kosong
          </li>
          <li>
            <b><StarIcon size={11} strokeWidth={1.8} /></b> Warnai bintang kalau rapi
          </li>
        </ol>
      )}

      {/* Penanda hitam di keempat sudut: server memakainya untuk meluruskan foto dan menghitung letak tiap kotak.
          Posisinya harus sama dengan PRINT_LAYOUT di apps/api/src/modules/tulis/sheetLayout.ts. */}
      <div className={styles.pGrid}>
        <i className={styles.pMarker} data-pos="tl" aria-hidden="true" />
        <i className={styles.pMarker} data-pos="tr" aria-hidden="true" />
        <i className={styles.pMarker} data-pos="bl" aria-hidden="true" />
        <i className={styles.pMarker} data-pos="br" aria-hidden="true" />
      <div className={styles.pRows} lang="ja">
        {sheet.chars.map((c) => (
          <section key={c.char} className={styles.pChar}>
            <div className={styles.pRow}>
              {exam ? (
                <div className={`${styles.box} ${styles.boxModel} ${styles.boxPrompt}`}>
                  <span>{c.reading}</span>
                  {c.meaning ? <small>{c.meaning}</small> : null}
                </div>
              ) : (
                <div className={`${styles.box} ${styles.boxModel}`}>
                  <span>{c.char}</span>
                  <small>{c.reading}</small>
                </div>
              )}
              {Array.from({ length: PRINT_BOXES }, (_, i) => (
                <div key={i} className={styles.box}>
                  {i < trace && <span className={styles.trace}>{c.char}</span>}
                </div>
              ))}
              <div className={styles.pRate}>
                <span aria-hidden="true" className={styles.pStars}>
                  <StarIcon size={13} strokeWidth={1.6} />
                  <StarIcon size={13} strokeWidth={1.6} />
                  <StarIcon size={13} strokeWidth={1.6} />
                </span>
                {c.strokes && !exam ? <small>{c.strokes} goresan</small> : null}
              </div>
            </div>
            <div className={styles.pRow}>
              <div className={styles.pAgain}>
                もう<br />一回
              </div>
              {Array.from({ length: PRINT_BOXES }, (_, i) => (
                <div key={i} className={styles.box} />
              ))}
            </div>
          </section>
        ))}
      </div>
      </div>

      <footer className={styles.pFoot}>
        <div className={styles.pProverb}>
          <span lang="ja">{proverb.ja}</span>
          <small>{proverb.id}</small>
        </div>
        <ul className={styles.pChecklist}>
          <li>{exam ? `Kotak 1–${exam.requiredWrites} sudah terisi` : "Semua kotak sudah terisi"}</li>
          <li>Tulisan di dalam kotak</li>
          <li>Sudah difoto di aplikasi</li>
        </ul>
        <div className={styles.pStamp}>
          <span lang="ja">よくできました</span>
          <small>Stempel / paraf</small>
        </div>
      </footer>
      <p className={styles.pBrand}>日本語 (Nihongo) bersama Miu-chan · Foto lembar ini dari atas dengan cahaya terang supaya bisa diperiksa.</p>
    </div>
  );
}

/** Lembar cetak dipasang langsung di <body> supaya saat dicetak tidak terpotong oleh tata letak aplikasi yang bergulir. */
export function PrintSheet({ sheet, exam }: { sheet: Sheet; exam?: ExamPrint }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(<PrintWorksheet sheet={sheet} exam={exam} />, document.body) : null;
}

export function TulisBuku() {
  const sheets = useMemo(buildSheets, []);
  const [script, setScript] = useState<Sheet["script"]>("hiragana");
  const [sheet, setSheet] = useState<Sheet>(() => sheets[0]);
  const [step, setStep] = useState<Step>("pilih");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checked, setChecked] = useState<CheckedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(1);
  const [progress, setProgress] = useState<Progress>({});

  useEffect(() => setProgress(readProgress()), []);

  async function check(current: ScanResult | null = scan) {
    if (!current) return;
    // Pemindai bisa mengenali bahwa yang difoto lembar lain, dan pengguna memilih memeriksanya sebagai lembar itu
    const target = sheets.find((s) => s.id === current.sheetId) ?? sheet;
    if (target.id !== sheet.id) {
      setSheet(target);
      setScript(target.script);
    }
    setScan(current);
    setStep("periksa");
    setError(null);
    setResult(null);
    setChecked(current.photo);
    try {
      const body = {
        image: current.photo.src,
        corners: current.corners,
        script: target.script,
        chars: target.chars.map(({ char, reading, strokes }) => ({ char, reading, strokes, tips: HIRAGANA_STROKE_DATA[char]?.strokeTips })),
      };
      let res: CheckResult;
      try {
        res = await periksaTulisan(body);
      } catch (err) {
        // Layanan AI gratis kadang sibuk sesaat: coba sekali lagi otomatis sebelum menyerah
        if (!(err instanceof ApiError) || err.code !== "CHECK_FAILED") throw err;
        res = await periksaTulisan(body);
      }
      setResult(res);
      if (res.photoOk) setProgress(saveProgress(target.id, res.score, res.grade));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Pemeriksaan gagal. Coba lagi sebentar lagi.");
    }
    setStep("hasil");
  }

  useEffect(() => {
    if (step !== "periksa") return;
    setStage(1);
    const timers = [setTimeout(() => setStage(2), 14000), setTimeout(() => setStage(3), 28000)];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  function restart(toStep: Step) {
    setScan(null);
    setResult(null);
    setChecked(null);
    setError(null);
    setStep(toStep);
  }

  const stepIndex = step === "pilih" ? 0 : step === "pindai" ? 1 : 2;
  const scannerSheets = useMemo(() => sheets.map((s) => ({ id: s.id, label: `${SCRIPT_LABEL[s.script]} · ${s.title}`, chars: s.chars })), [sheets]);
  const last = progress[sheet.id];
  const charsOf = (s: Sheet) => s.chars.map((c) => c.char).join("");

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow} lang="ja">
            てがき・ノート
          </p>
          <h1 className={styles.heading}>Tulis di Buku</h1>
          <p className={styles.lead}>Menulis dengan pensil di lembar cetak, lalu foto. Miu-chan menandai huruf yang perlu diperbaiki dan memberi nilai.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/neko/chibi/neko-chibi.webp" alt="" className={styles.heroMascot} />
        <div data-spotlight="tulis-buku-langkah">
          <Stepper index={stepIndex} />
        </div>
      </header>

      {step === "pilih" && (
        <div className={styles.pickLayout}>
          <section className={styles.panel} aria-labelledby="pilih-lembar" data-spotlight="tulis-buku-lembar">
            <h2 id="pilih-lembar" className={styles.panelTitle}>
              Pilih lembar latihan
            </h2>
            <div className={styles.segment} role="tablist" aria-label="Jenis huruf">
              {(["hiragana", "katakana", "kanji"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={script === s}
                  className={styles.segmentBtn}
                  onClick={() => {
                    setScript(s);
                    setSheet(sheets.find((x) => x.script === s)!);
                  }}
                >
                  {SCRIPT_LABEL[s]}
                </button>
              ))}
            </div>
            <div className={styles.sheetList}>
              {sheets
                .filter((s) => s.script === script)
                .map((s) => {
                  const p = progress[s.id];
                  return (
                    <button key={s.id} type="button" className={styles.sheetPick} aria-pressed={sheet.id === s.id} onClick={() => setSheet(s)}>
                      <span className={styles.sheetPickChars} lang="ja">
                        {charsOf(s)}
                      </span>
                      <span className={styles.sheetPickMeta}>
                        <span className={styles.sheetPickTitle}>{s.title}</span>
                        {p ? (
                          <span className={styles.sheetBadge} data-grade={p.grade} title={`Nilai terakhir ${p.score}`}>
                            {p.grade} · {p.score}
                          </span>
                        ) : (
                          <span className={styles.sheetBadgeNew}>Belum</span>
                        )}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>

          <section className={`${styles.panel} ${styles.selected}`} aria-labelledby="lembar-terpilih">
            <div className={styles.selectedHead}>
              <div>
                <p className={styles.kicker}>{SCRIPT_LABEL[sheet.script]}</p>
                <h2 id="lembar-terpilih" className={styles.panelTitle}>
                  {sheet.title} <span lang="ja">{charsOf(sheet)}</span>
                </h2>
              </div>
              {last && (
                <p className={styles.lastScore}>
                  Nilai terakhir <b data-grade={last.grade}>{last.grade}</b> {last.score}
                </p>
              )}
            </div>
            <MiniSheet sheet={sheet} />
            <ul className={styles.legend}>
              <li data-kind="model">Contoh</li>
              <li data-kind="trace">Tebalkan</li>
              <li data-kind="own">Tulis sendiri</li>
            </ul>

            <div className={styles.actions} data-spotlight="tulis-buku-aksi">
              <button type="button" className={styles.btnPrimary} onClick={() => setStep("pindai")}>
                <CameraIcon size={18} /> Sudah menulis, foto sekarang
              </button>
              <button type="button" className={styles.btnGhost} onClick={() => window.print()}>
                <PrinterIcon size={18} /> Cetak lembar
              </button>
            </div>

            <ul className={styles.howto} data-spotlight="tulis-buku-cara">
              <li>
                <PrinterIcon size={18} />
                <span>
                  <b>Cetak lembar ini.</b> Kotak hitam kecil di sudutnya membantu kamera menemukan setiap kotak.
                </span>
              </li>
              <li>
                <PencilIcon size={18} />
                <span>
                  <b>Tulis dengan pensil 2B atau pulpen hitam</b>, di tengah kotak, mengikuti urutan goresan.
                </span>
              </li>
              <li>
                <CameraIcon size={18} />
                <span>
                  <b>Foto dari atas</b> dengan cahaya terang. Kamera memotret dan memeriksa otomatis.
                </span>
              </li>
            </ul>
            <details className={styles.noPrinter}>
              <summary>Tidak punya printer?</summary>
              <p>
                Gambar kotak-kotak seperti pratinjau di atas di buku kotak (genkō yōshi), lengkap dengan huruf contoh di kolom pertama. Usahakan
                ukuran kotaknya sama supaya Miu-chan bisa menemukannya.
              </p>
            </details>
          </section>
        </div>
      )}

      {step === "pindai" && (
        <section className={styles.panel}>
          <div className={styles.scanHead}>
            <div>
              <p className={styles.kicker}>Lembar yang diperiksa</p>
              <h2 className={styles.panelTitle}>
                {SCRIPT_LABEL[sheet.script]} · {sheet.title} <span lang="ja">{charsOf(sheet)}</span>
              </h2>
            </div>
            <button type="button" className={styles.linkBtn} onClick={() => restart("pilih")}>
              Ganti
            </button>
          </div>
          <SheetScanner charCount={sheet.chars.length} sheetId={sheet.id} sheets={scannerSheets} onDone={(r) => void check(r)} />
        </section>
      )}

      {step === "periksa" && (
        <section className={`${styles.panel} ${styles.analyzing}`} aria-live="polite">
          <div className={styles.analyzingPhotoWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {scan && <img src={scan.photo.src} alt="" className={styles.analyzingPhoto} />}
            <span className={styles.analyzingLine} aria-hidden="true" />
          </div>
          <div className={styles.analyzingSide}>
            <p className={styles.analyzingText}>Miu-chan sedang memeriksa…</p>
            <ol className={styles.stages}>
              {CHECK_STAGES.map((label, i) => (
                <li key={label} data-state={i < stage ? "done" : i === stage ? "active" : "todo"}>
                  <span aria-hidden="true">{i < stage ? <CheckIcon size={12} strokeWidth={3} /> : null}</span>
                  {label}
                </li>
              ))}
            </ol>
            <p className={styles.muted}>Pemeriksaan teliti dua tahap, biasanya 20–40 detik.</p>
          </div>
        </section>
      )}

      {step === "hasil" && (
        <section className={styles.panel}>
          <div>
            <p className={styles.kicker}>Hasil koreksi</p>
            <h2 className={styles.panelTitle}>
              {SCRIPT_LABEL[sheet.script]} · {sheet.title} <span lang="ja">{charsOf(sheet)}</span>
            </h2>
          </div>
          {error || !result || !checked ? (
            <div className={styles.notice} role="alert">
              <strong>Belum bisa diperiksa</strong>
              <p>{error ?? "Pemeriksaan gagal. Coba lagi sebentar lagi."}</p>
            </div>
          ) : !result.photoOk ? (
            <div className={styles.notice} role="alert">
              <strong>Fotonya belum bisa dibaca Miu-chan</strong>
              <p>{result.photoProblem || "Tulisan di foto kurang jelas."}</p>
              <p className={styles.muted}>Foto dari atas dengan cahaya terang, pastikan seluruh kotak masuk bingkai dan tidak ada bayangan tangan.</p>
            </div>
          ) : (
            <TulisHasil result={result} photo={checked} />
          )}
          <div className={styles.actions}>
            {error ? (
              <button type="button" className={styles.btnPrimary} onClick={() => void check()}>
                Coba periksa lagi
              </button>
            ) : (
              <button type="button" className={styles.btnPrimary} onClick={() => restart("pindai")}>
                <CameraIcon size={18} /> {result?.photoOk === false ? "Foto ulang" : "Tulis ulang & foto lagi"}
              </button>
            )}
            <button type="button" className={styles.btnGhost} onClick={() => restart("pilih")}>
              Pilih lembar lain
            </button>
          </div>
          <Link href="/huruf" className={styles.backLink}>
            Latihan menulis di layar →
          </Link>
        </section>
      )}

      {/* Hanya tampil saat dicetak */}
      <PrintSheet sheet={sheet} />
    </div>
  );
}
