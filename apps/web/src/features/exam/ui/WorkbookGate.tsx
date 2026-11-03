"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import type { CheckResult } from "@/features/huruf/data/tulisApi";
import { DrawnGridScanner, type DrawnScan } from "@/features/huruf/ui/DrawnGridScanner";
import { SheetScanner, type ScanResult } from "@/features/huruf/ui/SheetScanner";
import { PrintSheet, type Sheet } from "@/features/huruf/ui/TulisBuku";
import { TulisHasil, type CheckedPhoto } from "@/features/huruf/ui/TulisHasil";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import {
  workbookGateApi,
  type CanvasStroke,
  type GateMode,
  type GateSheet,
  type GateStatus,
  type SheetType,
  type WorkbookAttempt,
  type WorkbookResult,
  type WorkbookStatus,
} from "../data/workbookGateApi";
import { WorkbookCanvas } from "./WorkbookCanvas";
import styles from "./workbookGate.module.css";
import { NotebookIcon, PenLineIcon, PrinterIcon } from "@/shared/ui/icons";

type Phase = "loading" | "intro" | "kertas" | "pindai" | "periksa" | "kanvas" | "hasil" | "error";

const SCRIPT_LABEL: Record<GateSheet["script"], string> = { hiragana: "Hiragana", katakana: "Katakana", kanji: "Kanji" };

const STATUS_LABEL: Record<GateStatus, string> = { rapi: "Rapi", kurang: "Perlu dirapikan", salah: "Salah", kosong: "Belum ditulis" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Contoh kisi yang harus digambar, dengan nomor soal di tiap kotak (nomor hanya di contoh, bukan di kertas). */
function DrawnGridPreview({ cols, rows, count }: { cols: number; rows: number; count: number }) {
  const size = 22;
  const w = cols * size;
  const h = rows * size;
  return (
    <svg className={styles.drawPreview} viewBox={`-3 -3 ${w + 6} ${h + 6}`} role="img" aria-label={`Contoh kisi ${cols} kolom × ${rows} baris`}>
      <rect x={0} y={0} width={w} height={h} className={styles.drawFrame} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`c${i}`} x1={(i + 1) * size} y1={0} x2={(i + 1) * size} y2={h} className={styles.drawLine} />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line key={`r${i}`} x1={0} y1={(i + 1) * size} x2={w} y2={(i + 1) * size} className={styles.drawLine} />
      ))}
      {Array.from({ length: cols * rows }, (_, i) => (
        <text key={i} x={(i % cols) * size + size / 2} y={Math.floor(i / cols) * size + size / 2} className={styles.drawNo} data-unused={i >= count || undefined}>
          {i < count ? i + 1 : "—"}
        </text>
      ))}
    </svg>
  );
}

/** Lembar ujian dalam bentuk yang dipakai lembar cetak & pemindai Tulis di Buku. */
function toPrintSheet(s: GateSheet): Sheet {
  return { id: `gate-${s.index}`, script: s.script, title: `Lembar ${s.index + 1}`, chars: s.chars.map((c) => ({ char: c.char, reading: c.reading, meaning: c.meaning })) };
}

/**
 * Gerbang Tulis: menulis tangan huruf/kanji level ini dari ingatan sebelum ujian naik level terbuka.
 * Jalur kertas (cetak → tulis → foto per lembar) atau jalur kanvas (tulis di layar, urutan goresan ikut dinilai).
 */
export function WorkbookGate({ levelId }: { levelId: number }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<WorkbookStatus | null>(null);
  const [attempt, setAttempt] = useState<WorkbookAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  // n bertambah setiap klik, supaya mencetak lembar yang sama dua kali tetap memicu dialog cetak
  const [print, setPrint] = useState<{ index: number; n: number } | null>(null);
  const [check, setCheck] = useState<{ result: CheckResult; photo: CheckedPhoto } | null>(null);
  const [result, setResult] = useState<WorkbookResult | null>(null);

  const load = useCallback(() => {
    setPhase("loading");
    workbookGateApi
      .status(levelId)
      .then((s) => {
        setStatus(s);
        setPhase("intro");
      })
      .catch((err: Error) => {
        setError(err.message);
        setPhase("error");
      });
  }, [levelId]);

  useEffect(load, [load]);

  // Cetak setelah lembar yang dipilih terpasang di <body>
  useEffect(() => {
    if (!print) return;
    const t = setTimeout(() => window.print(), 50);
    return () => clearTimeout(t);
  }, [print]);

  const nextHref = status?.levelCode === "PEMULA" ? "/belajar/gerbang-hiragana" : `/belajar/tes-naik-tahap?levelId=${levelId}`;
  const allChars = useMemo(() => attempt?.sheets.flatMap((s) => s.chars) ?? [], [attempt]);

  async function start(mode: GateMode, sheetType?: SheetType) {
    setError(null);
    setBusy(true);
    try {
      const a = await workbookGateApi.start(levelId, mode, sheetType);
      setAttempt(a);
      setPhase(mode === "kertas" ? "kertas" : "kanvas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gerbang Tulis belum bisa dimulai.");
    } finally {
      setBusy(false);
    }
  }

  async function checkSheet(scan: ScanResult | DrawnScan) {
    if (!attempt) return;
    setPhase("periksa");
    setError(null);
    setCheck(null);
    const body = { index: sheetIndex, image: scan.photo.src, corners: scan.corners, ...("xs" in scan ? { grid: { xs: scan.xs, ys: scan.ys } } : {}) };
    try {
      let res;
      try {
        res = await workbookGateApi.sheet(attempt.attemptId, body);
      } catch (err) {
        // Layanan AI gratis kadang sibuk sesaat: coba sekali lagi otomatis sebelum menyerah
        if (!(err instanceof ApiError) || err.code !== "CHECK_FAILED") throw err;
        res = await workbookGateApi.sheet(attempt.attemptId, body);
      }
      setAttempt({ ...attempt, sheets: attempt.sheets.map((s) => (s.index === res.sheet.index ? res.sheet : s)) });
      setCheck({ result: res.check, photo: scan.photo });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Pemeriksaan gagal. Coba lagi sebentar lagi.");
    }
    setPhase("kertas");
  }

  async function finishPaper() {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await workbookGateApi.finish(attempt.attemptId));
      setPhase("hasil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nilai belum bisa dihitung.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCanvas(written: { char: string; strokes: CanvasStroke[] }[]) {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await workbookGateApi.canvas(attempt.attemptId, written));
      setPhase("hasil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tulisanmu belum bisa dinilai. Coba kirim lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <SkeletonRegion label="Memuat Gerbang Tulis…" className={styles.wrap}>
        <Skeleton height="16rem" radius="var(--radius-lg)" />
      </SkeletonRegion>
    );
  }

  if (phase === "error" || !status) {
    return (
      <div className={styles.wrap}>
        <Alert>{error ?? "Gerbang Tulis belum bisa dimuat."}</Alert>
        <Button variant="secondary" onClick={load}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (phase === "intro") {
    const resume = !!status.activeAttemptId;
    return (
      <div className={styles.wrap}>
        <section className={styles.card}>
          <Mascot mood={status.passed ? "senang" : "semangat"} size={84} />
          <p className={styles.eyebrow} lang="ja">
            しけん · れんしゅうちょう
          </p>
          <h1 className={styles.title}>Gerbang Tulis {status.levelCode === "PEMULA" ? "Kana" : status.levelCode}</h1>
          <p className={styles.lead}>
            Sebelum {status.levelCode === "PEMULA" ? "Mastery Gate" : "tes naik tahap"} terbuka, tunjukkan bahwa tanganmu sudah hafal huruf-huruf
            level ini. Kamu hanya melihat bacaan dan artinya, lalu menulis hurufnya dari ingatan.
          </p>

          {status.passed ? (
            <>
              <Alert tone="success">Kamu sudah lulus Gerbang Tulis level ini{status.bestScore !== null ? ` (nilai ${status.bestScore})` : ""}.</Alert>
              <Link href={nextHref} className={styles.primaryLink}>
                Lanjut ke {status.levelCode === "PEMULA" ? "Mastery Gate" : "tes naik tahap"} →
              </Link>
            </>
          ) : (
            <>
              <ul className={styles.rules}>
                <li>
                  <strong>{status.config.questionCount}</strong> huruf acak dari level ini, berbeda tiap percobaan
                </li>
                <li>
                  Lulus bila nilai rata-rata <strong>≥ {status.config.passScore}</strong>
                </li>
                <li>Hijau = rapi, kuning = perlu dirapikan, merah = salah huruf atau salah urutan goresan</li>
                {status.config.cooldownHours > 0 && <li>Belum lulus? Bisa mencoba lagi setelah {status.config.cooldownHours} jam</li>}
              </ul>

              {error && <Alert>{error}</Alert>}

              {status.canTake || resume ? (
                <div className={styles.modes}>
                  <button type="button" className={styles.mode} onClick={() => start("kertas", "gambar")} disabled={busy}>
                    <span className={styles.modeIcon} aria-hidden="true">
                      <NotebookIcon size={26} strokeWidth={1.7} />
                    </span>
                    <strong>Gambar kisi sendiri</strong>
                    <span>Tanpa printer: gambar kotak-kotak di buku atau kertas apa saja, tulis satu huruf per kotak, lalu foto sekali.</span>
                  </button>
                  <button type="button" className={styles.mode} onClick={() => start("kertas", "cetak")} disabled={busy}>
                    <span className={styles.modeIcon} aria-hidden="true">
                      <PrinterIcon size={26} strokeWidth={1.7} />
                    </span>
                    <strong>Cetak lembar</strong>
                    <span>Cetak lembar ujian, tulis tiap huruf 3×, lalu foto per lembar.</span>
                  </button>
                  <button type="button" className={styles.mode} onClick={() => start("kanvas")} disabled={busy}>
                    <span className={styles.modeIcon} aria-hidden="true">
                      <PenLineIcon size={26} strokeWidth={1.7} />
                    </span>
                    <strong>Tulis di layar</strong>
                    <span>Pakai jari atau stilus. Urutan dan arah goresan ikut dinilai, hasilnya langsung keluar.</span>
                  </button>
                </div>
              ) : null}
              {status.canTake || resume ? (
                <p className={styles.muted}>Di kertas, Miu-chan menilai bentuk, proporsi, dan letak huruf; urutan goresan hanya bisa dinilai di layar.</p>
              ) : (
                <Alert tone="info">
                  {status.cooldownUntil
                    ? `Bisa mencoba lagi pada ${formatDate(status.cooldownUntil)}.`
                    : `Selesaikan dulu minimal ${status.config.minChapterCompletion}% bab level ini (sekarang ${status.chaptersCompleted}/${status.chaptersTotal} bab).`}
                </Alert>
              )}
              {resume && <p className={styles.muted}>Kamu punya percobaan yang belum selesai; memilih jalur yang sama akan melanjutkannya.</p>}
            </>
          )}
          <Link href="/belajar" className={styles.backLink}>
            ← Kembali belajar
          </Link>
          <p className={styles.muted}>
            Data urutan goresan:{" "}
            <a href="http://kanjivg.tagaini.net" target="_blank" rel="noreferrer">
              KanjiVG
            </a>{" "}
            © Ulrich Apel, CC BY-SA 3.0.
          </p>
        </section>
      </div>
    );
  }

  if (phase === "kanvas" && attempt) {
    return (
      <div className={styles.wrap}>
        {error && <Alert>{error}</Alert>}
        <WorkbookCanvas chars={allChars} submitting={busy} onSubmit={submitCanvas} />
      </div>
    );
  }

  if ((phase === "kertas" || phase === "pindai" || phase === "periksa") && attempt) {
    const sheet = attempt.sheets[sheetIndex];
    const doneCount = attempt.sheets.filter((s) => s.done).length;
    const printSheets = attempt.sheets.map(toPrintSheet);
    const examPrint = (i: number) => ({ levelCode: status.levelCode, index: i, total: attempt.sheets.length, requiredWrites: attempt.requiredWrites });
    const drawn = attempt.sheetType === "gambar" ? attempt.grid : null;

    if (phase === "pindai" && drawn) {
      return (
        <div className={styles.wrap}>
          <h1 className={styles.titleSm}>Foto kisimu</h1>
          <DrawnGridScanner cols={drawn.cols} rows={drawn.rows} onDone={(scan) => void checkSheet(scan)} />
          <Button variant="ghost" onClick={() => setPhase("kertas")}>
            ← Kembali
          </Button>
        </div>
      );
    }

    if (phase === "pindai") {
      const target = printSheets[sheetIndex];
      return (
        <div className={styles.wrap}>
          <h1 className={styles.titleSm}>
            Foto lembar {sheetIndex + 1} · {SCRIPT_LABEL[sheet.script]}
          </h1>
          <p className={styles.muted}>Pastikan yang difoto lembar nomor {sheetIndex + 1}: lembar ujian tidak mencetak hurufnya, jadi Miu-chan tidak bisa mengenali lembar lain.</p>
          <SheetScanner
            charCount={target.chars.length}
            sheetId={target.id}
            sheets={[{ id: target.id, label: `Lembar ${sheetIndex + 1}`, chars: target.chars }]}
            onDone={(scan) => void checkSheet(scan)}
          />
          <Button variant="ghost" onClick={() => setPhase("kertas")}>
            ← Kembali ke daftar lembar
          </Button>
        </div>
      );
    }

    if (phase === "periksa") {
      return (
        <div className={styles.wrap}>
          <section className={styles.card} aria-live="polite">
            <Mascot mood="berpikir" size={72} />
            <h1 className={styles.titleSm}>Miu-chan sedang memeriksa {drawn ? "kisimu" : `lembar ${sheetIndex + 1}`}…</h1>
            <p className={styles.muted}>Biasanya 10–20 detik. Jangan tutup halaman ini.</p>
          </section>
        </div>
      );
    }

    const checkResult = check && (
      <section className={styles.card} aria-label="Hasil pemeriksaan foto">
        {check.result.photoOk ? (
          <TulisHasil result={check.result} photo={check.photo} />
        ) : (
          <Alert tone="info">{check.result.photoProblem} Foto ini tidak dihitung sebagai percobaan.</Alert>
        )}
      </section>
    );

    if (drawn) {
      const tries = attempt.sheets[0]?.tries ?? 0;
      const done = !!attempt.sheets[0]?.done;
      return (
        <div className={styles.wrap}>
          <section className={`${styles.card} ${styles.cardLeft}`}>
            <h1 className={styles.titleSm}>Gambar kisimu sendiri</h1>
            <div className={styles.drawGuide}>
              <DrawnGridPreview cols={drawn.cols} rows={drawn.rows} count={allChars.length} />
              <ol className={styles.drawSteps}>
                <li>
                  Pakai pena/spidol <b>gelap</b> dan penggaris. Gambar <b>satu bingkai</b> berisi <b>{drawn.cols} kolom × {drawn.rows} baris</b> kotak, ±2 cm per
                  kotak.
                </li>
                <li>Garis sekat harus menyambung ke bingkai. Jangan menulis apa pun di luar kotak di dalam bingkai.</li>
                <li>
                  Tulis jawaban nomor 1, 2, 3… di kotak <b>dari kiri ke kanan, baris demi baris</b>, satu huruf per kotak, di tengah kotak. Tanpa
                  melihat contoh!
                </li>
                <li>Foto dari atas dengan cahaya terang; seluruh bingkai harus terlihat.</li>
              </ol>
            </div>
            <h2 className={styles.notesTitle}>Yang harus ditulis</h2>
            <ol className={styles.promptList}>
              {allChars.map((c, i) => (
                <li key={`${c.char}-${i}`}>
                  <span className={styles.promptNo}>{i + 1}</span>
                  <span lang="ja" className={styles.promptText}>
                    {c.reading}
                  </span>
                  <span className={styles.muted}>{c.script === "kanji" ? c.meaning : SCRIPT_LABEL[c.script]}</span>
                </li>
              ))}
            </ol>
            {error && <Alert>{error}</Alert>}
            <p className={styles.muted}>
              {done ? `Sudah difoto (${tries}/${attempt.maxSheetTries}).` : "Belum difoto."} Kisi boleh difoto paling banyak {attempt.maxSheetTries} kali.
            </p>
            <div className={styles.actions}>
              <Button
                variant={done ? "secondary" : "primary"}
                disabled={tries >= attempt.maxSheetTries}
                onClick={() => {
                  setSheetIndex(0);
                  setCheck(null);
                  setPhase("pindai");
                }}
              >
                {done ? "Foto ulang" : "Foto kisimu"}
              </Button>
              <Button disabled={!done || busy} onClick={finishPaper}>
                {busy ? "Menghitung nilai…" : "Selesai & lihat nilai"}
              </Button>
            </div>
          </section>
          {checkResult}
        </div>
      );
    }

    return (
      <div className={styles.wrap}>
        <section className={styles.card}>
          <h1 className={styles.titleSm}>Lembar ujian ({doneCount}/{attempt.sheets.length} sudah difoto)</h1>
          <p className={styles.muted}>
            Cetak tiap lembar, tulis setiap huruf {attempt.requiredWrites}× di kotak 1–{attempt.requiredWrites} baris atas tanpa melihat contoh, lalu foto. Tiap lembar
            boleh difoto paling banyak {attempt.maxSheetTries} kali.
          </p>
          {error && <Alert>{error}</Alert>}
          <ol className={styles.sheetList}>
            {attempt.sheets.map((s, i) => (
              <li key={s.index} className={styles.sheetItem} data-done={s.done || undefined}>
                <div className={styles.sheetInfo}>
                  <strong>
                    Lembar {i + 1} · {SCRIPT_LABEL[s.script]}
                  </strong>
                  <span className={styles.sheetPrompts} lang="ja">
                    {s.chars.map((c) => c.reading).join(" · ")}
                  </span>
                  <span className={styles.muted}>{s.done ? `Sudah difoto (${s.tries}/${attempt.maxSheetTries})` : "Belum difoto"}</span>
                </div>
                <div className={styles.sheetActions}>
                  <Button variant="secondary" onClick={() => setPrint((p) => ({ index: i, n: (p?.n ?? 0) + 1 }))}>
                    Cetak
                  </Button>
                  <Button
                    variant={s.done ? "ghost" : "primary"}
                    disabled={s.tries >= attempt.maxSheetTries}
                    onClick={() => {
                      setSheetIndex(i);
                      setCheck(null);
                      setPhase("pindai");
                    }}
                  >
                    {s.done ? "Foto ulang" : "Foto"}
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          <Button block disabled={doneCount < attempt.sheets.length || busy} onClick={finishPaper}>
            {busy ? "Menghitung nilai…" : doneCount < attempt.sheets.length ? `Foto ${attempt.sheets.length - doneCount} lembar lagi` : "Selesai & lihat nilai"}
          </Button>
        </section>

        {checkResult}

        {print && <PrintSheet sheet={printSheets[print.index]} exam={examPrint(print.index)} />}
      </div>
    );
  }

  if (phase === "hasil" && result) {
    const bad = result.results.filter((r) => r.status !== "rapi");
    return (
      <div className={styles.wrap}>
        <section className={styles.card}>
          {result.passed && <div className={styles.confetti} aria-hidden="true" />}
          <Mascot mood={result.passed ? "senang" : "semangat"} size={96} />
          <h1 className={styles.title}>{result.passed ? "Lulus Gerbang Tulis! おめでとう！" : "Belum lulus, ayo latihan lagi!"}</h1>
          <div className={styles.scoreBox} data-ok={result.passed || undefined}>
            <span className={styles.scoreNum}>{result.score}</span>
            <span className={styles.muted}>dari 100 · minimal {result.passScore}</span>
          </div>
          <ul className={styles.charGrid} aria-label="Nilai per huruf">
            {result.results.map((r, i) => (
              <li key={`${r.char}-${i}`} className={styles.charCell} data-status={r.status} title={`${r.char}: ${STATUS_LABEL[r.status]} (${r.score})`}>
                <span lang="ja">{r.char}</span>
                <small>{r.score}</small>
              </li>
            ))}
          </ul>
          {bad.length > 0 && (
            <div className={styles.notes}>
              <h2 className={styles.notesTitle}>Perlu dilatih ({bad.length})</h2>
              <ul>
                {bad.map((r, i) => (
                  <li key={`${r.char}-${i}`}>
                    <span className={styles.noteChar} lang="ja" data-status={r.status}>
                      {r.char}
                    </span>
                    <span>
                      <strong>{STATUS_LABEL[r.status]}.</strong> {r.notes.join(" ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!result.passed && result.cooldownUntil && <Alert tone="info">Bisa mencoba lagi pada {formatDate(result.cooldownUntil)}. Latih dulu huruf yang merah dan kuning di Tulis di Buku.</Alert>}
          <div className={styles.actions}>
            {result.passed ? (
              <Link href={nextHref} className={styles.primaryLink}>
                Lanjut ke {status.levelCode === "PEMULA" ? "Mastery Gate" : "tes naik tahap"} →
              </Link>
            ) : (
              <Link href="/belajar/tulis-buku" className={styles.primaryLink}>
                Latihan di Tulis di Buku
              </Link>
            )}
            <Link href="/belajar" className={styles.backLink}>
              Kembali belajar
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
