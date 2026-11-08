"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { workbookGateApi, type WorkbookStatus } from "@/features/exam/data/workbookGateApi";
import { NekoAvatar } from "@/shared/ui/neko/NekoAvatar";
import { SceneProp } from "./MapScenery";
import type { ChapterSummary, Level } from "../domain/types";
import styles from "./worldMap.module.css";
import { StarIcon } from "@/shared/ui/icons";

export interface MapUnit {
  key: string;
  title: string;
  chapters: ChapterSummary[];
}

/** Disimpan ResultView saat bab lulus; peta memutar animasi selesai + node berikutnya terbuka. */
export const JUST_COMPLETED_KEY = "nihongo:justCompleted";

/**
 * Ukuran peta per lebar layar. room = ruang tambahan di atas node aktif supaya maskot berdiri utuh.
 * Nilai node/maskot di worldMap.module.css harus selaras (--node-active, --mascot).
 */
const DIMS = {
  // Liukan ponsel sedikit lebih sempit agar hiasan di samping node tidak terpotong tepi layar
  compact: { gap: 112, amplitude: 62, room: 84, mascot: 76 },
  wide: { gap: 168, amplitude: 190, room: 124, mascot: 112 },
};
const WIDE_QUERY = "(min-width: 900px)";

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}
// Satu gelombang penuh tiap 8 node: tengah → kanan → tengah → kiri
const WAVE = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6];

type NodeState = "completed" | "active" | "open" | "locked";

function nodeState(c: ChapterSummary, nextId: string | null): NodeState {
  if (c.status === "completed") return "completed";
  if (c.status === "locked") return "locked";
  return c.id === nextId ? "active" : "open";
}

export function starsFor(score: number | null): number {
  if (score === null) return 0;
  return score >= 90 ? 3 : score >= 75 ? 2 : 1;
}

function countLabel(c: ChapterSummary) {
  return [c.counts.vocab && `${c.counts.vocab} kata`, c.counts.kanji && `${c.counts.kanji} kanji`, c.counts.grammar && `${c.counts.grammar} pola`]
    .filter(Boolean)
    .join(" · ");
}

const STATE_LABEL: Record<NodeState, string> = { completed: "selesai", active: "sedang dipelajari", open: "terbuka", locked: "terkunci" };

/** Garis jalur: kurva halus melewati pusat node; ruas menuju node yang sudah terbuka diberi warna. */
function PathLine({ xs, ys, height, reached }: { xs: number[]; ys: number[]; height: number; reached: boolean[] }) {
  const clipId = `path-clip-${useId().replace(/:/g, "")}`;
  const y = (i: number) => ys[i];
  const seg = (i: number) => {
    const h = (ys[i + 1] - ys[i]) / 2;
    return `C ${xs[i]} ${y(i) + h}, ${xs[i + 1]} ${y(i + 1) - h}, ${xs[i + 1]} ${y(i + 1)}`;
  };
  const all = xs.length > 1 ? `M ${xs[0]} ${y(0)} ` + xs.slice(0, -1).map((_, i) => seg(i)).join(" ") : "";
  const done = xs
    .slice(0, -1)
    .map((_, i) => (reached[i + 1] ? `M ${xs[i]} ${y(i)} ${seg(i)}` : ""))
    .join(" ");
  return (
    <svg className={styles.pathSvg} width={1} height={height} aria-hidden>
      {/* Potongan ini digeser tiap frame oleh WorldMap: garis "berjalan" mengikuti arah guliran */}
      <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
        <rect data-clip x={-2000} width={4000} y={0} height={0} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path d={all} className={styles.pathTrack} />
        {done && <path d={done} className={styles.pathDone} />}
      </g>
    </svg>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className={styles.stars} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? styles.starOn : styles.starOff} style={{ "--si": i } as React.CSSProperties}>
          <StarIcon filled size={14} strokeWidth={1.5} />
        </span>
      ))}
    </span>
  );
}

function NodeIcon({ state, index }: { state: NodeState; index: number }) {
  if (state === "completed")
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path className={styles.checkPath} d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  if (state === "locked")
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    );
  return <span className={styles.nodeNum}>{index + 1}</span>;
}

function ToriiIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="currentColor" aria-hidden>
      <path d="M4 9c6 2 34 2 40 0l-1 5H5z" />
      <rect x="9" y="17" width="30" height="4" rx="1" />
      <rect x="12" y="14" width="4" height="30" rx="1" />
      <rect x="32" y="14" width="4" height="30" rx="1" />
      <rect x="22" y="14" width="4" height="7" />
    </svg>
  );
}

type Selected = { kind: "chapter"; chapter: ChapterSummary; index: number; state: NodeState } | { kind: "gate" };

export function WorldMap({ units, nextId, level }: { units: MapUnit[]; nextId: string | null; level: Level }) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [gate, setGate] = useState<WorkbookStatus | null>(null);
  const [just, setJust] = useState<{ done: string; unlock: string | null } | null>(null);
  const mapRef = useRef<HTMLElement>(null);
  const mascotRef = useRef<HTMLSpanElement>(null);
  const wide = useWide();
  const dims = wide ? DIMS.wide : DIMS.compact;

  useEffect(() => {
    setGate(null);
    workbookGateApi.status(level.id).then(setGate).catch(() => setGate(null));
  }, [level.id, units]);

  // Bab yang baru saja lulus: animasi centang lalu node berikutnya terbuka
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(JUST_COMPLETED_KEY);
      if (id) sessionStorage.removeItem(JUST_COMPLETED_KEY);
    } catch {
      /* penyimpanan sesi tidak tersedia */
    }
    if (!id) return;
    const flat = units.flatMap((u) => u.chapters);
    const i = flat.findIndex((c) => c.id === id);
    if (i >= 0) setJust({ done: id, unlock: flat[i + 1]?.status !== "locked" ? flat[i + 1]?.id ?? null : null });
  }, [units]);

  // Miu-chan melompat dari node yang baru selesai ke node aktif berikutnya
  useEffect(() => {
    const mascot = mascotRef.current;
    const root = mapRef.current;
    if (!just || !mascot || !root) return;
    const from = root.querySelector<HTMLElement>(`[data-node-id="${just.done}"]`);
    const to = root.querySelector<HTMLElement>('[data-state="active"][data-node-id]');
    if (!from || !to || from === to) return;

    to.scrollIntoView({ block: "center", behavior: "smooth" });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    // Kaki maskot menapak di tepi atas node. Pakai titik tengah + ukuran asli (offsetHeight), karena node
    // bisa sedang mengecil oleh efek muncul-saat-digulir sehingga tepi rect-nya bergeser.
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - from.offsetHeight / 2 - (b.top + b.height / 2 - to.offsetHeight / 2);
    const peak = Math.max(70, Math.abs(dy) * 0.35);
    const at = (x: number, y: number, sx = 1, sy = 1) => `translate(${x}px, ${y}px) scale(${sx}, ${sy})`;

    const hop = mascot.animate(
      [
        { transform: at(dx, dy), offset: 0 },
        { transform: at(dx, dy + 4, 1.12, 0.86), offset: 0.14, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
        { transform: at(dx * 0.5, dy * 0.5 - peak, 0.94, 1.08), offset: 0.55, easing: "cubic-bezier(0.6, 0, 0.8, 0.4)" },
        { transform: at(0, 4, 1.14, 0.84), offset: 0.86, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
        { transform: at(0, 0), offset: 1 },
      ],
      // Mulai setelah centang node selesai tergores; tunggu gulir halus selesai
      { duration: 1100, delay: 900, fill: "backwards" },
    );
    return () => hop.cancel();
  }, [just]);

  let globalIndex = 0;
  const allChapters = units.flatMap((u) => u.chapters);
  const allDone = allChapters.length > 0 && allChapters.every((c) => c.status === "completed");
  const gateState: NodeState = gate?.passed
    ? "completed"
    : gate
      ? gate.chapterPct >= gate.config.minChapterCompletion
        ? "active"
        : "locked"
      : allDone
        ? "active"
        : "locked";

  /*
   * Garis jalur hanya tergambar di dalam "jendela" layar. Jendela yang tergambar mengejar posisi guliran dengan
   * sedikit jeda, jadi garis tampak berjalan memanjang ke arah guliran (dan memendek di sisi sebaliknya).
   * Node, kepala unit, dan gerbang muncul saat ujung garis mencapainya, dan hilang saat garis meninggalkannya.
   * Ditulis langsung ke DOM per frame (bukan state React) supaya guliran tetap mulus.
   */
  useEffect(() => {
    const root = mapRef.current;
    if (!root) return;
    const tracks = Array.from(root.querySelectorAll<HTMLElement>("[data-track]"));
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));

    const apply = (top: number, bottom: number) => {
      const sy = window.scrollY;
      for (const t of tracks) {
        const rect = t.querySelector("rect[data-clip]");
        if (!rect) continue;
        const tTop = t.getBoundingClientRect().top + sy;
        rect.setAttribute("y", String(top - tTop));
        rect.setAttribute("height", String(Math.max(0, bottom - top)));
      }
      for (const el of reveals) {
        // Skala efek muncul berpusat di tengah elemen, jadi titik tengah tidak bergeser saat tersembunyi
        const r = el.getBoundingClientRect();
        const y = r.top + r.height / 2 + sy;
        el.dataset.inview = String(y >= top && y <= bottom);
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(-Infinity, Infinity);
      return;
    }

    const target = () => [window.scrollY + window.innerHeight * 0.04, window.scrollY + window.innerHeight * 0.92];
    // Saat halaman dibuka, garis tumbuh dari tepi atas jendela ke bawah
    let [top] = target();
    let bottom = top;
    let frame = 0;
    const tick = () => {
      const [tt, tb] = target();
      top += (tt - top) * 0.12;
      bottom += (tb - bottom) * 0.12;
      const settled = Math.abs(tt - top) < 0.5 && Math.abs(tb - bottom) < 0.5;
      if (settled) {
        top = tt;
        bottom = tb;
      }
      apply(top, bottom);
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
  }, [units, gateState, wide]);

  return (
    <section className={styles.map} ref={mapRef} data-wide={wide || undefined} aria-label={`Peta belajar ${level.name}`}>
      {units.map((unit, ui) => {
        const startIndex = globalIndex;
        globalIndex += unit.chapters.length;
        const { gap, amplitude, room } = dims;
        const xs = unit.chapters.map((_, i) => WAVE[(startIndex + i) % WAVE.length] * amplitude);
        const states = unit.chapters.map((c) => nodeState(c, nextId));
        const activeAt = states.indexOf("active");
        const extra = (i: number) => (activeAt >= 0 && i >= activeAt ? room : 0);
        const ys = unit.chapters.map((_, i) => gap / 2 + i * gap + extra(i));
        const height = unit.chapters.length * gap + (activeAt >= 0 ? room : 0);
        const unitDone = states.filter((s) => s === "completed").length;
        const unitLocked = states.every((s) => s === "locked");
        // Unit terakhir: jalur diperpanjang melengkung ke tengah dan berakhir tepat di atas Gerbang Tulis
        const isLast = ui === units.length - 1;
        const tail = isLast ? Math.round(gap * 0.75) : 0;
        const pathXs = isLast ? [...xs, 0] : xs;
        const pathYs = isLast ? [...ys, height + tail] : ys;
        const reached = states.map((s) => s !== "locked");
        if (isLast) reached.push(gateState !== "locked");
        return (
          <div key={unit.key} className={styles.unit}>
            <header className={styles.unitHead} data-locked={unitLocked || undefined} data-reveal>
              <span className={styles.unitNo}>Unit {ui + 1}</span>
              <h2 className={styles.unitTitle}>{unit.title}</h2>
              <span className={styles.unitMeta}>
                {unitDone}/{unit.chapters.length} bab
              </span>
            </header>

            <ol className={styles.track} style={{ height: height + tail }} data-track>
              <PathLine xs={pathXs} ys={pathYs} height={height + tail} reached={reached} />
              {unit.chapters.map((c, i) => {
                const state = states[i];
                const index = startIndex + i;
                const x = xs[i];
                const side = x > 0 ? "left" : "right";
                const stars = starsFor(c.bestScore);
                const justState = just?.done === c.id ? "done" : just?.unlock === c.id ? "unlock" : undefined;
                return (
                  <li
                    key={c.id}
                    className={styles.nodeSlot}
                    style={{ "--x": `${x}px`, "--y": `${ys[i]}px`, "--ni": i } as React.CSSProperties}
                    data-side={side}
                    data-reveal
                  >
                    {/* Hiasan di sisi berlawanan dengan label, tidak di node aktif (ada maskot) */}
                    {state !== "active" && index % 3 !== 1 && (
                      <span className={styles.nodeProp}>
                        <SceneProp index={index} />
                      </span>
                    )}
                    {state === "active" && (
                      <span className={styles.nodeMascot} ref={mascotRef} aria-label="Miu-chan">
                        <span className={styles.mascotBody}>
                          <NekoAvatar
                            size={dims.mascot}
                            mode="idle"
                            emotion="semangat"
                            label="Miu-chan"
                            onTap={() => setSelected({ kind: "chapter", chapter: c, index, state })}
                          />
                        </span>
                      </span>
                    )}
                    <button
                      type="button"
                      className={styles.node}
                      data-state={state}
                      data-node-id={c.id}
                      data-spotlight={state === "active" ? "peta-bab-aktif" : undefined}
                      data-just={justState}
                      onClick={() => setSelected({ kind: "chapter", chapter: c, index, state })}
                      aria-label={`Bab ${index + 1}: ${c.title}, ${STATE_LABEL[state]}${stars ? `, ${stars} bintang` : ""}`}
                      aria-haspopup="dialog"
                    >
                      <NodeIcon state={state} index={index} />
                    </button>
                    <span className={styles.nodeLabel} data-state={state}>
                      <span className={styles.nodeTitle}>{c.title}</span>
                      {state === "completed" && <Stars count={stars} />}
                      {state === "active" && <span className={styles.nodeNow}>Sekarang</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}

      <div className={styles.gateWrap} data-reveal>
        <button
          type="button"
          className={styles.gate}
          data-state={gateState}
          data-spotlight="peta-gerbang"
          onClick={() => setSelected({ kind: "gate" })}
          aria-haspopup="dialog"
          aria-label={`Gerbang Tulis ${level.code}, ${STATE_LABEL[gateState]}`}
        >
          <ToriiIcon />
        </button>
        <span className={styles.gateLabel}>
          <strong>Gerbang Tulis</strong>
          <small>{gateState === "completed" ? "Lulus" : "Tulis tangan untuk naik level"}</small>
        </span>
      </div>

      {selected && <NodeSheet selected={selected} level={level} gate={gate} gateState={gateState} onClose={() => setSelected(null)} />}
    </section>
  );
}

function NodeSheet({
  selected,
  level,
  gate,
  gateState,
  onClose,
}: {
  selected: Selected;
  level: Level;
  gate: WorkbookStatus | null;
  gateState: NodeState;
  onClose: () => void;
}) {
  const actionRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) onClose();
    else setClosing(true);
  };

  useEffect(() => {
    actionRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let body: React.ReactNode;
  if (selected.kind === "chapter") {
    const { chapter: c, index, state } = selected;
    const stars = starsFor(c.bestScore);
    body = (
      <>
        <p className={styles.sheetEyebrow}>
          Bab {index + 1}
          {c.moduleTitle ? ` · ${c.moduleTitle}` : ""}
        </p>
        <h3 className={styles.sheetTitle} id="node-sheet-title">{c.title}</h3>
        {countLabel(c) && <p className={styles.sheetMeta}>{countLabel(c)}</p>}
        {state === "completed" && (
          <p className={styles.sheetScore}>
            <Stars count={stars} /> Nilai terbaik {c.bestScore}%
          </p>
        )}
        {state === "locked" ? (
          <p className={styles.sheetNote}>Selesaikan bab sebelumnya untuk membuka bab ini.</p>
        ) : (
          <ol className={styles.loop} aria-label="Alur sesi">
            <li>Ulang bab lalu</li>
            <li>Materi</li>
            <li>Praktik</li>
            <li>Kuis</li>
            <li>Hasil</li>
          </ol>
        )}
        {state === "locked" ? (
          <button type="button" className={styles.sheetBtnGhost} onClick={close} ref={(el) => void (actionRef.current = el)}>
            Tutup
          </button>
        ) : (
          <Link href={`/belajar/${c.id}`} className={styles.sheetBtn} ref={(el) => void (actionRef.current = el)}>
            {state === "completed" ? "Ulangi bab" : state === "active" ? "Mulai belajar" : "Buka bab"}
          </Link>
        )}
      </>
    );
  } else {
    const href = `/belajar/gerbang-tulis?levelId=${level.id}`;
    const need = gate?.config.minChapterCompletion;
    body = (
      <>
        <p className={styles.sheetEyebrow}>Gerbang naik level · {level.code === "PEMULA" ? "Kana" : level.code}</p>
        <h3 className={styles.sheetTitle} id="node-sheet-title">Gerbang Tulis</h3>
        <p className={styles.sheetMeta}>Tulis huruf dengan tangan di kertas atau kanvas, lalu foto atau kirim untuk dinilai. Lulus gerbang ini membuka tes naik level.</p>
        {gate && (
          <p className={styles.sheetNote}>
            Bab selesai: {gate.chaptersCompleted}/{gate.chaptersTotal}
            {need !== undefined && gateState === "locked" ? ` · butuh ${need}% untuk membuka` : ""}
            {gate.bestScore !== null ? ` · nilai terbaik ${gate.bestScore}%` : ""}
          </p>
        )}
        {gateState === "locked" ? (
          <button type="button" className={styles.sheetBtnGhost} onClick={close} ref={(el) => void (actionRef.current = el)}>
            Tutup
          </button>
        ) : (
          <Link href={href} className={styles.sheetBtn} ref={(el) => void (actionRef.current = el)}>
            {gateState === "completed" ? "Lihat gerbang" : "Masuk gerbang"}
          </Link>
        )}
      </>
    );
  }

  // Portal ke body: leluhur ber-transform (animasi masuk halaman) membuat position: fixed ikut halaman, bukan layar
  return createPortal(
    <div className={styles.sheetScrim} data-closing={closing || undefined} onClick={close} onAnimationEnd={(e) => closing && e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="node-sheet-title" onClick={(e) => e.stopPropagation()}>
        <span className={styles.sheetHandle} aria-hidden />
        {body}
      </div>
    </div>,
    document.body,
  );
}
