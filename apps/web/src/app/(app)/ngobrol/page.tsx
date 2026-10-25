"use client";

import { useState } from "react";
import { AskScreen } from "@/features/ask/ui/AskScreen";
import { VoiceChatScreen } from "@/features/ask/ui/VoiceChatScreen";
import styles from "./ngobrol.module.css";

type Tab = "tanya" | "suara";

export default function Page() {
  const [tab, setTab] = useState<Tab>("tanya");

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs} role="tablist" aria-label="Mode ngobrol">
        <button
          role="tab"
          aria-selected={tab === "tanya"}
          className={`${styles.tab} ${tab === "tanya" ? styles.tabActive : ""}`}
          onClick={() => setTab("tanya")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 5h16v11H10l-4 4V5z"/>
          </svg>
          Tanya AI
        </button>
        <button
          role="tab"
          aria-selected={tab === "suara"}
          className={`${styles.tab} ${tab === "suara" ? styles.tabActive : ""}`}
          onClick={() => setTab("suara")}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z"/>
          </svg>
          Suara
        </button>
      </div>

      <div className={styles.content}>
        {tab === "tanya" && <AskScreen />}
        {tab === "suara" && <VoiceChatScreen />}
      </div>
    </div>
  );
}
