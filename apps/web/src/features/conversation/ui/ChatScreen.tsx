"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { ArrowRightIcon } from "@/shared/ui/icons";
import { useConversation } from "../application/useConversation";
import { FuriganaText } from "./FuriganaText";
import { MicroFeedbackCard } from "./MicroFeedbackCard";
import styles from "./chat.module.css";

export function ChatScreen() {
  const { phase, session, messages, turnsLeft, report, error, start, send, end } = useConversation();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (phase === "idle" || phase === "starting") {
    return (
      <section className={styles.intro}>
        <Mascot mood="semangat" size={120} />
        <h1 className={styles.introTitle}>Ngobrol dengan Neko-sensei</h1>
        <p className={styles.muted}>Neko-sensei memakai kata-kata sesuai levelmu. Salah itu wajar, nanti dikoreksi dengan lembut.</p>
        {error && <Alert>{error}</Alert>}
        <Button onClick={() => start(null)} disabled={phase === "starting"}>
          {phase === "starting" ? "Memanggil Neko-sensei…" : "Mulai ngobrol bebas"}
        </Button>
      </section>
    );
  }

  if (phase === "ended" && report) {
    return (
      <section className={styles.intro}>
        <Mascot mood="senang" size={120} />
        <h1 className={styles.introTitle}>Kerja bagus!</h1>
        <p className={styles.muted}>
          Kamu menyelesaikan {report.turns} giliran dengan {report.corrections.length} koreksi.
        </p>
        {report.corrections.length > 0 && (
          <ul className={styles.reportList}>
            {report.corrections.map((c, i) => (
              <li key={i}>
                <span lang="ja">
                  <s>{c.original}</s> <ArrowRightIcon size={14} /> {c.corrected}
                </span>
                <p className={styles.muted}>{c.explanation}</p>
              </li>
            ))}
          </ul>
        )}
        <Button onClick={() => start(null)}>Ngobrol lagi</Button>
      </section>
    );
  }

  return (
    <section className={styles.chat}>
      <header className={styles.chatHeader}>
        <Mascot mood={phase === "waiting" ? "berpikir" : "senang"} size={44} />
        <div>
          <strong>{session?.mascot.name}</strong>
          <p className={styles.meta}>
            Level {session?.level}
            {turnsLeft !== null && ` · sisa ${turnsLeft} giliran`}
          </p>
        </div>
        <Button variant="ghost" onClick={end} className={styles.endButton}>
          Selesai
        </Button>
      </header>

      <ol ref={listRef} className={styles.messages} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.sender === "user" ? styles.userRow : styles.mascotRow}>
            {m.sender === "mascot" ? (
              <p className={styles.mascotBubble}>
                <FuriganaText text={m.text} />
              </p>
            ) : (
              <p lang="ja" className={styles.userBubble}>
                {m.text}
              </p>
            )}
            {m.correction && <MicroFeedbackCard correction={m.correction} />}
          </li>
        ))}
        {phase === "waiting" && (
          <li className={styles.mascotRow}>
            <p className={`${styles.mascotBubble} ${styles.typing}`} aria-label="Neko-sensei sedang mengetik">
              …
            </p>
          </li>
        )}
      </ol>

      {error && <Alert>{error}</Alert>}

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
          setDraft("");
        }}
      >
        <label htmlFor="chat-input" className="visually-hidden">
          Balasanmu
        </label>
        <input
          id="chat-input"
          lang="ja"
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tulis dalam bahasa Jepang…"
          autoComplete="off"
          disabled={phase === "waiting"}
        />
        <Button type="submit" disabled={phase === "waiting" || !draft.trim()}>
          Kirim
        </Button>
      </form>
    </section>
  );
}
