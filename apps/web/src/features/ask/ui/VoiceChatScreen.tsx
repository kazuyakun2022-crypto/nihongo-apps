"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { NekoAvatar, stillFor } from "@/shared/ui/neko/NekoAvatar";
import { useAuth } from "@/features/auth/application/AuthProvider";
import type { Gender } from "@/features/auth/domain/types";
import { useVoiceChat, type VoiceState } from "../application/useVoiceChat";
import { FormattedChatMessage } from "./FormattedChatMessage";
import { SpeechSubtitle } from "./SpeechSubtitle";
import subtitleStyles from "./subtitle.module.css";
import styles from "./voiceChat.module.css";

/* ── Label status ── */
const STATUS: Record<VoiceState, string> = {
  idle:       "Tahan tombol untuk bicara",
  listening:  "Mendengarkan…",
  processing: "Miu-chan berpikir…",
  speaking:   "Miu-chan berbicara…",
};

/** Panggilan kakak sesuai jenis kelamin yang didaftarkan. */
function siblingCall(gender: Gender | null | undefined): string | null {
  if (gender === "male") return "お兄ちゃん";
  if (gender === "female") return "お姉ちゃん";
  return null;
}

/* ── Sapaan pembuka, menyesuaikan waktu, nama, dan jenis kelamin akun ── */
function buildGreeting(name: string | null, gender: Gender | null | undefined): string {
  const hour = new Date().getHours();
  const time = hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 18 ? "sore" : "malam";
  const salam = hour < 11 ? "おはよう" : hour < 18 ? "こんにちは" : "こんばんは";
  const call = siblingCall(gender);
  const variants = name && call
    ? [
        `${salam}、${call}！ Seneng deh ${call} mampir lagi. Mau ngobrol apa hari ini?`,
        `あ、${call}だ！ ${salam}！ Hari ini mau latihan bahasa Jepang atau cerita-cerita dulu?`,
        `${call}、おかえり！ Aku udah nungguin dari tadi, hehe. Gimana kabarnya ${time} ini?`,
      ]
    : name
    ? [
        `Selamat ${time}, ${name}! Seneng deh kamu mampir lagi. Mau ngobrol apa hari ini?`,
        `Eh, ${name} datang! Selamat ${time} ya. Hari ini mau latihan bahasa Jepang atau cerita-cerita dulu?`,
        `Halo ${name}! Aku udah nungguin kamu dari tadi, hehe. Gimana kabarnya ${time} ini?`,
      ]
    : [
        `Selamat ${time}! Aku Miu-chan. Tahan tombolnya terus ngomong aja, aku dengerin kok.`,
        `Halo halo! Aku Miu-chan, teman ngobrol bahasa Jepangmu. Mau mulai dari mana nih?`,
      ];
  return variants[Math.floor(Math.random() * variants.length)];
}

/* ── Icon mic ── */
function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z"/>
    </svg>
  );
}

export interface VoiceChatScreenProps {
  hideHeader?: boolean;
  isActiveTab?: boolean;
}

export function VoiceChatScreen({ hideHeader = false, isActiveTab = true }: VoiceChatScreenProps = {}) {
  const {
    state,
    emotion,
    getMicLevel,
    getVoiceLevel,
    messages,
    transcript,
    spoken,
    getSpeechProgress,
    error,
    isSupported,
    startListening,
    stopListening,
    prefetchGreet,
    greet,
    stop,
    clear,
  } = useVoiceChat();
  const { status, user } = useAuth();
  const hasGreeted = useRef(false);
  // Sapaan dipilih sekali, supaya audio hasil prefetch cocok dengan teks yang diputar
  const greetingRef = useRef<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptListRef = useRef<HTMLDivElement>(null);
  const isHolding = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    }
  }, []);

  // Hentikan suara jika tab suara tidak aktif (misal pengguna pindah ke tab Tanya AI)
  useEffect(() => {
    if (!isActiveTab) {
      stop();
    }
  }, [isActiveTab, stop]);

  // Siapkan suara sapaan begitu data akun siap, tanpa menunggu tab Suara dibuka
  useEffect(() => {
    if (greetingRef.current || status === "loading" || !isSupported) return;
    const name = user && !user.isGuest ? user.displayName.trim() || null : null;
    greetingRef.current = buildGreeting(name, name ? user?.gender : null);
    prefetchGreet(greetingRef.current);
  }, [status, user, isSupported, prefetchGreet]);

  // Sapa saat tab suara aktif; audionya biasanya sudah siap dari prefetch
  useEffect(() => {
    if (!isActiveTab || hasGreeted.current || !greetingRef.current) return;
    hasGreeted.current = true;
    void greet(greetingRef.current);
  }, [isActiveTab, status, greet]);

  useEffect(() => {
    if (transcriptListRef.current) {
      transcriptListRef.current.scrollTop = transcriptListRef.current.scrollHeight;
    }
  }, [messages.length]);

  /* Hold-to-talk handlers */
  const handleHoldStart = (e: React.PointerEvent) => {
    if (state !== "idle" && state !== "speaking") return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isHolding.current = true;
    void startListening();
  };

  const handleHoldEnd = (e?: React.PointerEvent) => {
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
    if (!isHolding.current) return;
    isHolding.current = false;
    stopListening();
  };

  /* Hold-to-talk via Spasi (laptop/desktop). Ref dipakai agar listener tidak perlu dipasang ulang tiap render. */
  const stateRef = useRef(state);
  stateRef.current = state;
  const startRef = useRef(startListening);
  startRef.current = startListening;
  const stopRef = useRef(stopListening);
  stopRef.current = stopListening;

  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

    const release = () => {
      if (!isHolding.current) return;
      isHolding.current = false;
      stopRef.current();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTypingTarget(e.target)) return;
      // Cegah scroll halaman & aktivasi tombol yang sedang fokus
      e.preventDefault();
      if (e.repeat || isHolding.current) return;
      const s = stateRef.current;
      if (s !== "idle" && s !== "speaking") return;
      isHolding.current = true;
      void startRef.current();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTypingTarget(e.target)) return;
      e.preventDefault();
      release();
    };

    // Jendela kehilangan fokus saat Spasi ditahan → keyup tidak akan datang
    const onBlur = () => release();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const isActive = state === "listening";
  // Koreksi dari jawaban terakhir Miu-chan, tampil sampai user bicara lagi
  const lastMessage = messages[messages.length - 1];
  const latestCorrection = lastMessage?.role === "ai" ? lastMessage.correction : null;
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
      {/* Top bar info (ditampilkan jika bukan bagian dari halaman gabungan) */}
      {!hideHeader && (
        <div className={styles.topBar}>
          <span className={styles.topTitle}>Miu-chan 🐱</span>
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
      )}

      {/* Floating actions saat header disembunyikan */}
      {hideHeader && messages.length > 0 && (
        <div className={styles.floatingTopActions}>
          <button
            type="button"
            className={styles.floatingActionBtn}
            onClick={() => setShowTranscript(true)}
            aria-label="Lihat percakapan"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5h16v11H10l-4 4V5z"/>
            </svg>
            <span>Teks ({messages.length})</span>
          </button>
          <button
            type="button"
            className={styles.floatingActionBtn}
            onClick={clear}
            aria-label="Hapus percakapan"
          >
            Hapus
          </button>
        </div>
      )}

      {/* Maskot Miu-chan: satu animasi tanpa putus untuk semua status dan emosi */}
      <div className={styles.avatarArea}>
        <div className={styles.mascotContainer}>
          <NekoAvatar
            mode={state}
            emotion={emotion}
            micLevel={getMicLevel}
            voiceLevel={getVoiceLevel}
            label={STATUS[state]}
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

        {/* Slot subtitle & transkrip — ukuran tetap agar maskot tidak berpindah */}
        <div className={styles.transcriptSlot}>
          {state === "speaking" && spoken ? (
            <SpeechSubtitle key={spoken.id} text={spoken.text} runs={spoken.runs} emotion={emotion} getProgress={getSpeechProgress} />
          ) : transcript ? (
            <p className={styles.liveTranscript} aria-live="polite">
              "{transcript}"
            </p>
          ) : null}
          {latestCorrection && state !== "listening" && (
            <p className={subtitleStyles.correction}>
              <span className={subtitleStyles.correctionLabel}>Yang benar</span>
              <span className={subtitleStyles.correctionText} lang="ja">{latestCorrection}</span>
            </p>
          )}
        </div>
      </div>

      {/* Floating Error Alert (tidak menggeser letak maskot dan tombol mic) */}
      {error && (
        <div className={styles.floatingAlert}>
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {/* Tombol hold-to-talk */}
      <div className={styles.holdArea}>
        <button
          className={`${styles.holdBtn} ${isActive ? styles.holdBtnActive : ""}`}
          type="button"
          onPointerDown={handleHoldStart}
          onPointerUp={handleHoldEnd}
          onPointerCancel={handleHoldEnd}
          onPointerLeave={handleHoldEnd}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          disabled={state === "processing"}
          aria-pressed={isActive}
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
        <p className={`${styles.keyHint} ${isActive || isBusy ? styles.keyHintHidden : ""}`}>
          atau tahan <kbd className={styles.kbd}>Spasi</kbd>
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
                  {m.role === "ai" ? <img src={"/neko/" + stillFor(m.emotion ?? "biasa")} alt="Miu-chan" className={styles.transcriptMascotImg} /> : "Kamu"}
                </div>
                <div className={`${styles.msgBubble} ${m.role === "ai" ? styles.msgBubbleAi : styles.msgBubbleUser}`}>
                  <FormattedChatMessage content={m.text} isAi={m.role === "ai"} />
                  {m.correction && (
                    <p className={subtitleStyles.correction} style={{ marginTop: "var(--space-2)" }}>
                      <span className={subtitleStyles.correctionLabel}>Yang benar</span>
                      <span className={subtitleStyles.correctionText} lang="ja">{m.correction}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
