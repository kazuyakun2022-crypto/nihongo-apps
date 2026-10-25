"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { useVoiceChat, type VoiceState } from "../application/useVoiceChat";
import styles from "./voiceChat.module.css";

/* ── Label status ── */
const STATUS: Record<VoiceState, string> = {
  idle:       "Tahan tombol untuk bicara",
  listening:  "Mendengarkan…",
  processing: "Neko-sensei berpikir…",
  speaking:   "Neko-sensei berbicara…",
};

/* ── Gambar avatar berubah sesuai state ── */
const AVATAR_IMG: Record<VoiceState, string> = {
  idle:       "/images/neko-idle.png",
  listening:  "/images/neko-listening.png",
  processing: "/images/neko-thinking.png",
  speaking:   "/images/neko-speaking.png",
};

/* ── Icon mic ── */
function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z"/>
    </svg>
  );
}

export function VoiceChatScreen() {
  const { state, messages, transcript, error, isSupported, startListening, stopListening, clear } = useVoiceChat();
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptListRef = useRef<HTMLDivElement>(null);
  const isHolding = useRef(false);

  useEffect(() => {
    if (transcriptListRef.current) {
      transcriptListRef.current.scrollTop = transcriptListRef.current.scrollHeight;
    }
  }, [messages.length]);

  /* Hold-to-talk handlers */
  const handleHoldStart = (e: React.PointerEvent) => {
    if (state !== "idle" && state !== "speaking") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isHolding.current = true;
    void startListening();
  };

  const handleHoldEnd = () => {
    if (!isHolding.current) return;
    isHolding.current = false;
    stopListening();
  };

  const isActive = state === "listening";
  const isBusy = state === "processing";

  if (!isSupported) {
    return (
      <div className={styles.unsupported}>
        <span style={{ fontSize: "3rem" }}>😔</span>
        <p>Browser ini belum mendukung perekaman suara. Coba buka dengan <strong>Chrome</strong>, <strong>Edge</strong>, atau <strong>Safari</strong> terbaru.</p>
      </div>
    );
  }

  return (
    <section className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.topTitle}>Neko-sensei 🐱</span>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {messages.length > 0 && (
            <button
              className={styles.transcriptToggle}
              onClick={() => setShowTranscript(true)}
              aria-label="Lihat percakapan"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 5h16v11H10l-4 4V5z"/>
              </svg>
              Lihat teks
            </button>
          )}
          {messages.length > 0 && (
            <button className={styles.transcriptToggle} onClick={clear} aria-label="Hapus percakapan">
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Maskot Neko-sensei (Tanpa frame/lingkaran background, full transparan) */}
      <div className={styles.avatarArea}>
        <div
          className={[
            styles.mascotContainer,
            state === "idle" ? styles.mascotIdle : "",
            isActive ? styles.mascotListening : "",
            state === "processing" ? styles.mascotProcessing : "",
            state === "speaking" ? styles.mascotSpeaking : "",
          ].filter(Boolean).join(" ")}
        >
          <img
            src={AVATAR_IMG[state]}
            alt="Neko-sensei"
            className={styles.mascotImg}
            draggable={false}
          />
        </div>

        {/* Status */}
        <p className={[
          styles.statusText,
          isActive ? styles.statusListening : "",
          state === "processing" ? styles.statusProcessing : "",
          state === "speaking" ? styles.statusSpeaking : "",
        ].filter(Boolean).join(" ")}>
          {STATUS[state]}
        </p>

        {/* Kalimat user yang tertangkap, tampil selagi Neko-sensei berpikir */}
        {transcript && (
          <p className={styles.liveTranscript} aria-live="polite">
            "{transcript}"
          </p>
        )}
      </div>

      {/* Error */}
      {error && <Alert>{error}</Alert>}

      {/* Tombol hold-to-talk */}
      <div className={styles.holdArea}>
        <button
          className={`${styles.holdBtn} ${isActive ? styles.holdBtnActive : ""}`}
          disabled={isBusy}
          onPointerDown={handleHoldStart}
          onPointerUp={handleHoldEnd}
          onPointerCancel={handleHoldEnd}
          onPointerLeave={handleHoldEnd}
          aria-label="Tahan untuk bicara"
        >
          <MicIcon />
        </button>
        <p className={styles.holdHint}>
          {isActive
            ? "Lepas untuk kirim"
            : isBusy
              ? "Tunggu sebentar…"
              : state === "speaking"
                ? "Tahan untuk menyela"
                : "Tahan untuk bicara, bahasa Indonesia atau Jepang"}
        </p>
      </div>

      {/* Panel transkrip — slide up overlay */}
      {showTranscript && (
        <div className={styles.transcriptPanel}>
          <div className={styles.transcriptHeader}>
            <h2>Percakapan</h2>
            <Button variant="ghost" onClick={() => setShowTranscript(false)}>
              Tutup
            </Button>
          </div>
          <div ref={transcriptListRef} className={styles.transcriptList}>
            {messages.map((m) => (
              <div key={m.id} className={`${styles.msgRow} ${m.role === "user" ? styles.msgRowUser : ""}`}>
                <div className={`${styles.msgAvatar} ${m.role === "user" ? styles.msgAvatarUser : ""}`}>
                  {m.role === "ai" ? <img src="/images/neko-idle.png" alt="Neko" className={styles.transcriptMascotImg} /> : "Kamu"}
                </div>
                <p className={`${styles.msgBubble} ${m.role === "ai" ? styles.msgBubbleAi : styles.msgBubbleUser}`}>
                  {m.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
