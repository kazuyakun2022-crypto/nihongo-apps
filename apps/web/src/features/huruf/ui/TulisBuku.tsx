"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HIRAGANA_BASIC, KANJI_N5, KATAKANA_BASIC } from "../data/characters";
import { HIRAGANA_STROKE_DATA } from "../data/hiraganaStrokes";
import styles from "./tulisBuku.module.css";

/**
 * Latihan menulis di buku fisik: pilih lembar → cetak/salin ke buku → foto → periksa.
 * Pengenalan tulisan dari foto belum tersedia; hasil pemeriksaan saat ini adalah pratinjau tampilan.
 */

interface Sheet {
  id: string;
  script: "hiragana" | "katakana" | "kanji";
  title: string;
  chars: { char: string; reading: string }[];
}

/** Kotak latihan per huruf: 1 contoh + 5 kotak kosong (2 kotak pertama bergaris bantu tipis). */
const PRACTICE_BOXES = 5;

const ROW_NAMES: Record<string, string> = { "∅": "a", K: "ka", S: "sa", T: "ta", N: "na", H: "ha", M: "ma", Y: "ya", R: "ra", W: "wa", "N'": "n" };

function buildSheets(): Sheet[] {
  const hiraganaRows = new Map<string, Sheet["chars"]>();
  for (const h of HIRAGANA_BASIC) {
    const key = h.row === "N'" ? "W" : h.row; // ん digabung ke baris wa
    hiraganaRows.set(key, [...(hiraganaRows.get(key) ?? []), { char: h.char, reading: h.romaji }]);
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
  for (let i = 0; i < KANJI_N5.length; i += 6) {
    const group = KANJI_N5.slice(i, i + 6);
    sheets.push({
      id: `j-${i / 6 + 1}`,
      script: "kanji",
      title: `Kanji N5 · Set ${i / 6 + 1}`,
      chars: group.map((k) => ({ char: k.character, reading: k.meaningId ?? k.kunyomi })),
    });
  }
  return sheets;
}

const SCRIPT_LABEL: Record<Sheet["script"], string> = { hiragana: "Hiragana", katakana: "Katakana", kanji: "Kanji N5" };

type Step = "pilih" | "pindai" | "periksa" | "hasil";

interface CellResult {
  char: string;
  reading: string;
  /** Potongan foto baris tulisan siswa. */
  crop: string | null;
  status: "benar" | "perbaiki";
  detected: string;
  note: string;
}

/** Huruf yang sering tertukar, untuk contoh koreksi pada pratinjau. */
const LOOKALIKE: Record<string, string> = {
  あ: "お", お: "あ", い: "り", り: "い", さ: "ち", ち: "さ", ぬ: "め", め: "ぬ", ね: "れ", れ: "わ", わ: "ね", は: "ほ", ほ: "は", る: "ろ", ろ: "る",
  シ: "ツ", ツ: "シ", ソ: "ン", ン: "ソ", ク: "ケ", ケ: "ク", ア: "マ", マ: "ア", ウ: "ワ", ワ: "ウ", 人: "入", 入: "人", 土: "士", 日: "目", 目: "日",
};

function correctionNote(char: string, script: Sheet["script"]): string {
  const tips = HIRAGANA_STROKE_DATA[char]?.strokeTips;
  if (tips?.length) return tips[tips.length - 1].replace(/^\d+\.\s*/, "Perhatikan goresan terakhir: ");
  if (script === "katakana") return "Katakana tersusun dari garis lurus dan tegas; perhatikan arah dan sudut goresan.";
  return "Periksa jumlah dan urutan goresan; jaga proporsi tiap bagian di dalam kotak.";
}

/** Potong foto lembar menjadi strip per baris huruf (lembar dicetak dengan tata letak tetap). */
async function cropRows(photo: string, rows: number): Promise<string[]> {
  const img = new Image();
  img.src = photo;
  await img.decode();
  const canvas = document.createElement("canvas");
  const rowH = img.height / rows;
  canvas.width = 480;
  canvas.height = Math.round((480 * rowH) / img.width);
  const ctx = canvas.getContext("2d")!;
  return Array.from({ length: rows }, (_, r) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, r * rowH, img.width, rowH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  });
}

function Worksheet({ sheet, printable = false }: { sheet: Sheet; printable?: boolean }) {
  return (
    <div className={printable ? styles.printSheet : styles.sheet} lang="ja" data-print-sheet={printable || undefined}>
      {printable && (
        <div className={styles.printHeader}>
          <strong>
            {SCRIPT_LABEL[sheet.script]} · {sheet.title}
          </strong>
          <span>Nama: ____________________ Tanggal: __________</span>
        </div>
      )}
      <div className={styles.sheetGrid}>
        {sheet.chars.map((c) => (
          <div key={c.char} className={styles.sheetRow}>
            <div className={`${styles.box} ${styles.boxModel}`}>
              <span>{c.char}</span>
              <small>{c.reading}</small>
            </div>
            {Array.from({ length: PRACTICE_BOXES }, (_, i) => (
              <div key={i} className={styles.box}>
                {i < 2 && <span className={styles.trace}>{c.char}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      {printable && <p className={styles.printFoot}>Nihongo bersama Miu-chan · Tulis di dalam kotak, lalu foto seluruh lembar dari atas dengan cahaya terang.</p>}
    </div>
  );
}

export function TulisBuku() {
  const sheets = useMemo(buildSheets, []);
  const [script, setScript] = useState<Sheet["script"]>("hiragana");
  const [sheet, setSheet] = useState<Sheet>(() => sheets[0]);
  const [step, setStep] = useState<Step>("pilih");
  const [photo, setPhoto] = useState<string | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "unavailable">("off");
  const [results, setResults] = useState<CellResult[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera((c) => (c === "unavailable" ? c : "off"));
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("on");
    } catch {
      setCamera("unavailable");
    }
  }

  /** Ambil area di dalam bingkai panduan saja. */
  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const frameW = video.videoWidth * 0.82;
    const frameH = Math.min(video.videoHeight * 0.9, frameW * 1.3);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(frameW);
    canvas.height = Math.round(frameH);
    canvas.getContext("2d")!.drawImage(video, (video.videoWidth - frameW) / 2, (video.videoHeight - frameH) / 2, frameW, frameH, 0, 0, frameW, frameH);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      stopCamera();
    };
    reader.readAsDataURL(file);
  }

  async function check() {
    if (!photo) return;
    setStep("periksa");
    const [crops] = await Promise.all([cropRows(photo, sheet.chars.length).catch(() => []), new Promise((r) => setTimeout(r, 2200))]);
    // Pratinjau: sebagian huruf ditandai perlu diperbaiki agar tampilan koreksi terlihat
    setResults(
      sheet.chars.map((c, i) => {
        const wrong = (i * 7 + sheet.chars.length) % 5 === 2;
        return {
          char: c.char,
          reading: c.reading,
          crop: crops[i] ?? null,
          status: wrong ? "perbaiki" : "benar",
          detected: wrong ? LOOKALIKE[c.char] ?? "?" : c.char,
          note: wrong ? correctionNote(c.char, sheet.script) : "Bentuk dan proporsi sudah baik.",
        };
      }),
    );
    setStep("hasil");
  }

  function restart(toStep: Step) {
    setPhoto(null);
    setResults(null);
    setStep(toStep);
  }

  const steps: { key: Step; label: string }[] = [
    { key: "pilih", label: "Pilih lembar" },
    { key: "pindai", label: "Foto tulisan" },
    { key: "hasil", label: "Koreksi" },
  ];
  const stepIndex = step === "periksa" ? 2 : steps.findIndex((s) => s.key === step);
  const correct = results?.filter((r) => r.status === "benar").length ?? 0;

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <p className={styles.eyebrow} lang="ja">
          てがき・ノート
        </p>
        <h1 className={styles.heading}>Tulis di Buku</h1>
        <p className={styles.lead}>Latihan menulis dengan pensil di buku atau lembar cetak, lalu foto tulisanmu untuk diperiksa Miu-chan.</p>
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.key} className={styles.step} data-state={i < stepIndex ? "done" : i === stepIndex ? "active" : "todo"}>
              <span className={styles.stepNum}>{i < stepIndex ? "✓" : i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>
      </header>

      {step === "pilih" && (
        <section className={styles.panel}>
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
              .map((s) => (
                <button key={s.id} type="button" className={styles.sheetPick} aria-pressed={sheet.id === s.id} onClick={() => setSheet(s)}>
                  <span className={styles.sheetPickChars} lang="ja">
                    {s.chars.map((c) => c.char).join("")}
                  </span>
                  <span className={styles.sheetPickTitle}>{s.title}</span>
                </button>
              ))}
          </div>

          <div className={styles.previewHead}>
            <h2 className={styles.panelTitle}>
              Lembar: {SCRIPT_LABEL[sheet.script]} · {sheet.title}
            </h2>
            <p className={styles.muted}>Kotak pertama contoh, dua kotak berikutnya untuk menebalkan, sisanya tulis sendiri.</p>
          </div>
          <Worksheet sheet={sheet} />

          <div className={styles.tipsRow}>
            <div className={styles.tip}>
              <strong>Tidak punya printer?</strong> Salin kotak-kotak ini ke buku bergaris kotak (genkō yōshi) atau buku kotak biasa.
            </div>
            <div className={styles.tip}>
              <strong>Pakai pensil 2B / pulpen hitam</strong> agar tulisan terbaca jelas saat difoto.
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => window.print()}>
              🖨️ Cetak lembar
            </button>
            <button type="button" className={styles.btnPrimary} onClick={() => setStep("pindai")}>
              Sudah menulis → Foto tulisan
            </button>
          </div>
        </section>
      )}

      {step === "pindai" && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Foto lembar {sheet.title}</h2>
          {!photo ? (
            <>
              <div className={styles.scanner} data-camera={camera}>
                <video ref={videoRef} className={styles.video} playsInline muted />
                {camera !== "on" && (
                  <div className={styles.scannerIdle}>
                    <span className={styles.scannerIcon} aria-hidden="true">
                      📷
                    </span>
                    <p>
                      {camera === "unavailable"
                        ? "Kamera tidak bisa dibuka. Izinkan akses kamera, atau unggah foto dari galeri."
                        : camera === "starting"
                          ? "Membuka kamera…"
                          : "Letakkan buku di permukaan datar dengan cahaya terang."}
                    </p>
                  </div>
                )}
                <div className={styles.frame} aria-hidden="true">
                  <span className={styles.corner} data-pos="tl" />
                  <span className={styles.corner} data-pos="tr" />
                  <span className={styles.corner} data-pos="bl" />
                  <span className={styles.corner} data-pos="br" />
                  {camera === "on" && <span className={styles.scanLine} />}
                </div>
              </div>
              <p className={styles.muted}>Pastikan seluruh kotak masuk ke dalam bingkai, foto dari atas tanpa bayangan tangan.</p>
              <div className={styles.actions}>
                <button type="button" className={styles.btnGhost} onClick={() => fileRef.current?.click()}>
                  🖼️ Unggah foto
                </button>
                {camera === "on" ? (
                  <button type="button" className={styles.btnPrimary} onClick={capture}>
                    ◉ Ambil foto
                  </button>
                ) : (
                  camera !== "unavailable" && (
                    <button type="button" className={styles.btnPrimary} onClick={startCamera} disabled={camera === "starting"}>
                      Buka kamera
                    </button>
                  )
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Foto lembar tulisan" className={styles.photo} />
              <div className={styles.actions}>
                <button type="button" className={styles.btnGhost} onClick={() => setPhoto(null)}>
                  Foto ulang
                </button>
                <button type="button" className={styles.btnPrimary} onClick={check}>
                  Periksa tulisan
                </button>
              </div>
            </>
          )}
          <button type="button" className={styles.backLink} onClick={() => restart("pilih")}>
            ← Ganti lembar
          </button>
        </section>
      )}

      {step === "periksa" && (
        <section className={`${styles.panel} ${styles.analyzing}`} aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo && <img src={photo} alt="" className={styles.analyzingPhoto} />}
          <span className={styles.analyzingLine} aria-hidden="true" />
          <p className={styles.analyzingText}>Miu-chan sedang membaca tulisanmu…</p>
        </section>
      )}

      {step === "hasil" && results && (
        <section className={styles.panel}>
          <div className={styles.preview}>
            <strong>Mode pratinjau.</strong> Pemeriksaan tulisan dari foto masih dikembangkan; tanda benar/salah di bawah adalah contoh tampilan, bukan
            penilaian sungguhan.
          </div>
          <div className={styles.scoreRow}>
            <div className={styles.score}>
              <span className={styles.scoreNum}>
                {correct}/{results.length}
              </span>
              <span className={styles.muted}>huruf rapi</span>
            </div>
            <p className={styles.scoreMsg}>
              {correct === results.length ? "Semua rapi! すばらしい！" : "Bagus! Perbaiki huruf yang ditandai, lalu tulis ulang di kotak kosong."}
            </p>
          </div>
          <ul className={styles.results}>
            {results.map((r) => (
              <li key={r.char} className={styles.result} data-status={r.status}>
                <div className={styles.resultModel} lang="ja">
                  <span>{r.char}</span>
                  <small>{r.reading}</small>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.crop ? <img src={r.crop} alt={`Tulisanmu untuk ${r.char}`} className={styles.resultCrop} /> : <div className={styles.resultCrop} />}
                <div className={styles.resultBody}>
                  <span className={styles.resultStatus}>{r.status === "benar" ? "✓ Rapi" : `✗ Terbaca "${r.detected}"`}</span>
                  <span className={styles.resultNote}>{r.note}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => restart("pilih")}>
              Lembar lain
            </button>
            <button type="button" className={styles.btnPrimary} onClick={() => restart("pindai")}>
              Tulis ulang & foto lagi
            </button>
          </div>
          <Link href="/huruf" className={styles.backLink}>
            Latihan menulis di layar →
          </Link>
        </section>
      )}

      {/* Hanya tampil saat dicetak */}
      <Worksheet sheet={sheet} printable />
    </div>
  );
}
