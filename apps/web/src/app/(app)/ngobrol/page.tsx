"use client";

import { useState } from "react";
import { AskScreen } from "@/features/ask/ui/AskScreen";
import { VoiceChatScreen } from "@/features/ask/ui/VoiceChatScreen";
import styles from "./ngobrol.module.css";

type Tab = "tanya" | "suara";

export default function NgobrolPage() {
  const [tab, setTab] = useState<Tab>("tanya");

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
              <span className={styles.senseiBadge}>{tab === "suara" ? "3D Suara" : "AI Tutor"}</span>
            </div>
            <p className={styles.senseiStatus}>
              {tab === "suara" ? "Bicara langsung dengan suara" : "Tanya tata bahasa & kanji"}
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
      </div>
    </div>
  );
}
