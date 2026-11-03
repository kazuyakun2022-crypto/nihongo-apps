"use client";

import { Suspense, useEffect, useRef, useState, type TouchEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AskScreen } from "@/features/ask/ui/AskScreen";
import { VoiceChatScreen } from "@/features/ask/ui/VoiceChatScreen";
import { ScenarioList } from "@/features/conversation/ui/ScenarioList";
import styles from "./ngobrol.module.css";

type Tab = "tanya" | "suara" | "skenario";

const ORDER: Tab[] = ["tanya", "suara", "skenario"];
/** Geser minimal (px) dan rasio horizontal:vertikal supaya gulir biasa tidak dianggap pindah tab. */
const SWIPE_MIN_PX = 60;
const SWIPE_RATIO = 1.5;
const SWIPE_MAX_MS = 700;

/** Geser tidak dimulai dari kolom ketik, tombol tahan-bicara, atau elemen yang bisa digulir ke samping. */
function blocksSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable='true'], [data-no-swipe]")) return true;
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 2) return true;
  }
  return false;
}

function Ngobrol() {
  const initial = useSearchParams().get("tab");
  const [tab, setTabState] = useState<Tab>(initial === "skenario" || initial === "suara" ? initial : "tanya");
  /** Arah animasi panel yang baru tampil: masuk dari kanan (1) atau kiri (-1). */
  const [slide, setSlide] = useState<{ dir: 1 | -1; n: number } | null>(null);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);

  const setTab = (next: Tab) => {
    if (next === tab) return;
    setSlide((s) => ({ dir: ORDER.indexOf(next) > ORDER.indexOf(tab) ? 1 : -1, n: (s?.n ?? 0) + 1 }));
    setTabState(next);
  };

  // Geser kiri = tab berikutnya, geser kanan = tab sebelumnya
  const onTouchStart = (e: TouchEvent) => {
    touch.current = e.touches.length === 1 && !blocksSwipe(e.target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO || Date.now() - start.t > SWIPE_MAX_MS) return;
    const next = ORDER[ORDER.indexOf(tab) + (dx < 0 ? 1 : -1)];
    if (next) setTab(next);
  };
  const contentRef = useRef<HTMLDivElement>(null);

  // Panel yang baru tampil meluncur masuk dari arah geser (panel tidak dipasang ulang, jadi chat & suara tetap)
  useEffect(() => {
    if (!slide || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panel = contentRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    panel?.animate(
      [
        { transform: `translateX(${slide.dir * 28}%)`, opacity: 0.2 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [slide]);

  return (
    <div className={styles.wrapper}>
      {/* Top Header Terpadu */}
      <header className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.avatarMini}>
            <img
              src="/neko/splash/miu-open.webp"
              alt="Miu-chan"
              className={styles.avatarImg}
              draggable={false}
            />
          </div>
          <div className={styles.senseiMeta}>
            <div className={styles.titleRow}>
              <h1 className={styles.senseiName}>Miu-chan</h1>
              <span className={styles.senseiBadge}>{tab === "suara" ? "3D Suara" : tab === "skenario" ? "Role-play" : "AI Tutor"}</span>
            </div>
            <p className={styles.senseiStatus}>
              {tab === "suara" ? "Bicara langsung dengan suara" : tab === "skenario" ? "Latihan percakapan sesuai bab" : "Tanya tata bahasa & kanji"}
            </p>
          </div>
        </div>

        {/* Capsule Segmented Switcher */}
        <div className={styles.segmentedControl} role="tablist" aria-label="Mode ngobrol" data-spotlight="ngobrol-tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "tanya"}
            data-spotlight="ngobrol-tab-tanya"
            className={`${styles.segmentBtn} ${tab === "tanya" ? styles.segmentActive : ""}`}
            onClick={() => setTab("tanya")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Tanya AI</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "suara"}
            data-spotlight="ngobrol-tab-suara"
            className={`${styles.segmentBtn} ${tab === "suara" ? styles.segmentActive : ""}`}
            onClick={() => setTab("suara")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>Suara</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "skenario"}
            data-spotlight="ngobrol-tab-skenario"
            className={`${styles.segmentBtn} ${tab === "skenario" ? styles.segmentActive : ""}`}
            onClick={() => setTab("skenario")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Skenario</span>
          </button>
        </div>
      </header>

      {/* Konten Tab - Kedua tab tetap aktif di memori agar perpindahan mulus tanpa reset WebGL/percakapan */}
      <div ref={contentRef} className={styles.contentArea} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => (touch.current = null)}>
        <div
          className={styles.tabPanel}
          data-active={tab === "tanya"}
          style={{ display: tab === "tanya" ? "flex" : "none" }}
          role="tabpanel"
          aria-hidden={tab !== "tanya"}
        >
          <AskScreen hideHeader />
        </div>
        <div
          className={styles.tabPanel}
          data-active={tab === "suara"}
          style={{ display: tab === "suara" ? "flex" : "none" }}
          role="tabpanel"
          aria-hidden={tab !== "suara"}
        >
          <VoiceChatScreen hideHeader isActiveTab={tab === "suara"} />
        </div>
        {tab === "skenario" && (
          <div className={styles.tabPanel} data-active="true" style={{ display: "flex" }} role="tabpanel">
            <ScenarioList />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NgobrolPage() {
  return (
    <Suspense>
      <Ngobrol />
    </Suspense>
  );
}
