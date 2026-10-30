"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AskScreen } from "@/features/ask/ui/AskScreen";
import { VoiceChatScreen } from "@/features/ask/ui/VoiceChatScreen";
import { ScenarioList } from "@/features/conversation/ui/ScenarioList";
import styles from "./ngobrol.module.css";

type Tab = "tanya" | "suara" | "skenario";

function Ngobrol() {
  const initial = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>(initial === "skenario" || initial === "suara" ? initial : "tanya");

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
            <span className={styles.onlineDot} title="Miu-chan Siap Membantu" />
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
        <div className={styles.segmentedControl} role="tablist" aria-label="Mode ngobrol">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "tanya"}
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
            <span className={styles.liveIndicator} />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "skenario"}
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
      <div className={styles.contentArea}>
        <div
          className={styles.tabPanel}
          style={{ display: tab === "tanya" ? "flex" : "none" }}
          role="tabpanel"
          aria-hidden={tab !== "tanya"}
        >
          <AskScreen hideHeader />
        </div>
        <div
          className={styles.tabPanel}
          style={{ display: tab === "suara" ? "flex" : "none" }}
          role="tabpanel"
          aria-hidden={tab !== "suara"}
        >
          <VoiceChatScreen hideHeader isActiveTab={tab === "suara"} />
        </div>
        {tab === "skenario" && (
          <div className={styles.tabPanel} style={{ display: "flex" }} role="tabpanel">
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
