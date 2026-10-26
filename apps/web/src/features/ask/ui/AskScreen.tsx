"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { useAsk } from "../application/useAsk";
import { FormattedChatMessage } from "./FormattedChatMessage";
import styles from "./ask.module.css";

const CATEGORIZED_QUESTIONS = [
  "Bedanya partikel は dan が?",
  "Contoh salam sehari-hari di Jepang",
  "Kapan pakai bentuk です dan ます?",
  "Cara menghitung angka 1-10 & benda",
  "Tips cepat menghafal Hiragana & Katakana",
  "Contoh kalimat memesan makanan di resto",
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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  }

  return (
    <section className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.avatarContainer}>
          <img
            src="/images/neko-idle.png"
            alt="Neko-sensei"
            className={styles.headerAvatarImg}
            draggable={false}
          />
          <span className={styles.onlineBadge} title="Neko-sensei Siap Membantu" />
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.headerNameRow}>
            <h1 className={styles.headerName}>Neko-sensei</h1>
            <span className={styles.headerBadge}>Sensei AI</span>
          </div>
          <p className={styles.headerDesc}>Tanya apa saja tentang bahasa & budaya Jepang</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" className={styles.clearBtn} onClick={clear} aria-label="Hapus percakapan">
            Hapus Chat
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
            <h2 className={styles.emptyTitle}>Konnichiwa! Aku Neko-sensei</h2>
            <p className={styles.emptyDesc}>
              Mau tanya tata bahasa, cara baca kanji, kosakata, atau tips ujian JLPT? Tanyakan langsung di sini!
            </p>
            <div className={styles.chipsSection}>
              <span className={styles.chipsLabel}>Pertanyaan Populer:</span>
              <div className={styles.chips} role="list">
                {CATEGORIZED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className={styles.chip}
                    type="button"
                    onClick={() => {
                      ask(q);
                      textareaRef.current?.focus();
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </li>
        )}

        {/* Pesan */}
        {messages.map((m) =>
          m.role === "user" ? (
            <li key={m.id} className={styles.userRow}>
              <div className={styles.bubbleWrap}>
                <span className={styles.senderLabel}>Kamu</span>
                <div className={styles.userBubble}>
                  <FormattedChatMessage content={m.content} isAi={false} />
                </div>
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
                <div className={styles.senderHeader}>
                  <span className={styles.senderLabel}>Neko-sensei</span>
                  <span className={styles.aiBadge}>AI Tutor</span>
                </div>
                <div className={styles.aiBubble}>
                  <FormattedChatMessage content={m.content} isAi={true} />
                </div>
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
              <span className={styles.typingText}>Neko-sensei sedang menjawab</span>
              <div className={styles.dotsWrap}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          </li>
        )}
      </ul>

      {/* Error notification */}
      {error && (
        <div style={{ padding: "0 16px 8px" }}>
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {/* Composer Input Bar */}
      <div className={styles.composerWrap}>
        <div className={styles.composerInner}>
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
              onChange={(e) => {
                setDraft(e.target.value);
                // Auto-expand textarea
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Tanyakan apa saja tentang bahasa Jepang…"
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
          <p className={styles.hint}>Tekan Enter untuk kirim · Shift+Enter untuk baris baru</p>
        </div>
      </div>
    </section>
  );
}
