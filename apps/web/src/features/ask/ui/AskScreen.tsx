"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { useAsk } from "../application/useAsk";
import styles from "./ask.module.css";

const QUICK_QUESTIONS = [
  "🔤 Apa bedanya hiragana dan katakana?",
  "📝 Cara baca huruf は、が、を?",
  "💬 Bagaimana bilang 'terima kasih' dalam bahasa Jepang?",
  "🔢 Angka 1–10 dalam bahasa Jepang apa?",
  "📚 Tips cepat hafal hiragana?",
  "🗣️ Apa itu keigo (bahasa hormat)?",
];

export function AskScreen() {
  const { messages, loading, error, ask, clear } = useAsk();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, loading]);

  function submit() {
    const q = draft.trim();
    if (!q || loading) return;
    ask(q);
    setDraft("");
    // Reset tinggi textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  }

  return (
    <section className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <img
          src="/images/neko-idle.png"
          alt="Neko-sensei"
          className={styles.headerAvatarImg}
          draggable={false}
        />
        <div className={styles.headerInfo}>
          <h1 className={styles.headerName}>Neko-sensei</h1>
          <p className={styles.headerDesc}>Tanya apa saja tentang bahasa Jepang</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" className={styles.clearBtn} onClick={clear} aria-label="Hapus percakapan">
            Hapus
          </Button>
        )}
      </header>

      {/* Daftar pesan */}
      <ul
        ref={listRef}
        className={styles.messages}
        aria-live="polite"
        aria-label="Percakapan"
      >
        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <li className={styles.empty}>
            <img
              src="/images/neko-idle.png"
              alt="Neko-sensei"
              className={styles.emptyIllustrationImg}
              draggable={false}
            />
            <h2 className={styles.emptyTitle}>Halo! Aku Neko-sensei 🐱</h2>
            <p className={styles.emptyDesc}>
              Tanyakan apa saja tentang bahasa Jepang — huruf, grammar, kosakata, atau budaya Jepang.
            </p>
            <div className={styles.chips} role="list" aria-label="Pertanyaan cepat">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className={styles.chip}
                  role="listitem"
                  onClick={() => {
                    ask(q.replace(/^.+?\s/, "")); // hapus emoji di depan
                    textareaRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </li>
        )}

        {/* Pesan */}
        {messages.map((m) =>
          m.role === "user" ? (
            <li key={m.id} className={styles.userRow}>
              <div className={styles.bubbleWrap}>
                <span className={styles.senderLabel}>Kamu</span>
                <p className={styles.userBubble}>{m.content}</p>
              </div>
            </li>
          ) : (
            <li key={m.id} className={styles.aiRow}>
              <img
                src="/images/neko-idle.png"
                alt="Neko-sensei"
                className={styles.aiAvatarImg}
                draggable={false}
              />
              <div className={styles.bubbleWrap}>
                <span className={styles.senderLabel}>Neko-sensei</span>
                <p className={styles.aiBubble}>{m.content}</p>
              </div>
            </li>
          )
        )}

        {/* Typing indicator */}
        {loading && (
          <li className={styles.typingRow} aria-label="Sensei AI sedang menjawab">
            <img
              src="/images/neko-thinking.png"
              alt="Neko-sensei berpikir"
              className={styles.aiAvatarImg}
              draggable={false}
            />
            <div className={styles.typingBubble}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          </li>
        )}
      </ul>

      {/* Error */}
      {error && <Alert>{error}</Alert>}

      {/* Composer */}
      <div className={styles.composerWrap}>
        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={draft}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Tanya tentang bahasa Jepang…"
            aria-label="Pertanyaanmu"
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.sendBtn}
            disabled={loading || !draft.trim()}
            aria-label="Kirim pertanyaan"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </form>
        <p className={styles.hint}>Enter kirim · Shift+Enter baris baru</p>
      </div>
    </section>
  );
}
