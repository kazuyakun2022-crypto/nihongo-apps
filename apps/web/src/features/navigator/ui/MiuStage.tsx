"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { NekoAvatar, type NekoMode } from "@/shared/ui/neko/NekoAvatar";
import { useNavigator, type VoiceState } from "../application/NavigatorProvider";
import { Reveal } from "./Reveal";
import styles from "./stage.module.css";
import { CheckIcon, KeyboardIcon, LightbulbIcon, SendIcon } from "@/shared/ui/icons";

const MODE: Record<VoiceState, NekoMode> = {
  IDLE_FLOATING: "idle",
  LISTENING: "listening",
  THINKING: "processing",
  NAVIGATING: "processing",
  SPEAKING: "speaking",
  SPOTLIGHT_POINT: "idle",
};

const STATUS: Record<VoiceState, string> = {
  IDLE_FLOATING: "Ketuk mikrofon untuk bicara lagi",
  LISTENING: "Miu-chan mendengarkan…",
  THINKING: "Miu-chan berpikir…",
  NAVIGATING: "Siap, aku tunjukkan jalannya!",
  SPEAKING: "Miu-chan menjawab…",
  SPOTLIGHT_POINT: "",
};

const EXIT_MS = 320;

/**
 * Panggung Miu-chan: saat widget diketuk, kepala Miu (animasi sama seperti layar Suara) terbang dari pojok
 * ke tengah layar dan langsung mendengarkan. Begitu ia pergi membantu (tur), panggung menutup dan Miu
 * kembali ke pojok. Juga dipakai untuk sambutan pengguna baru.
 */
export function MiuStage() {
  const nav = useNavigator();
  const { stage, welcome } = nav;
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setMounted(true), []);

  // Tetap dirender sebentar setelah ditutup supaya animasi kembali ke pojok sempat berjalan
  useEffect(() => {
    if (stage.open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
      setTyping(false);
    }, EXIT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.open]);

  useEffect(() => {
    if (!stage.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && nav.closeStage();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage.open, nav]);

  useEffect(() => {
    if (typing) inputRef.current?.focus();
  }, [typing]);

  if (!mounted || !rendered) return null;

  const state = nav.voiceState;
  const caption = nav.micError ? { id: nav.micError } : nav.caption;
  const listening = state === "LISTENING";
  const busy = state === "THINKING" || state === "NAVIGATING";

  // Terbang dari titik widget di pojok ke tengah layar (dan sebaliknya saat ditutup)
  const origin = stage.origin;
  const fly: CSSProperties = origin
    ? ({ "--from-x": `${origin.x - window.innerWidth / 2}px`, "--from-y": `${origin.y - window.innerHeight / 2}px` } as CSSProperties)
    : ({ "--from-x": "0px", "--from-y": "40px" } as CSSProperties);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    void nav.sendCommand(t);
  };

  return createPortal(
    <div className={styles.stage} data-closing={closing || undefined} style={fly} role="dialog" aria-modal="true" aria-label="Bicara dengan Miu-chan">
      <div className={styles.backdrop} onClick={nav.closeStage} />

      <div className={styles.panel}>
        <button type="button" className={styles.close} onClick={nav.closeStage} aria-label="Tutup, Miu-chan kembali ke pojok">
          ×
        </button>

        <div className={styles.avatar} data-listening={listening || undefined}>
          <span className={styles.glow} aria-hidden />
          <NekoAvatar
            mode={MODE[state]}
            emotion={state === "NAVIGATING" ? "semangat" : welcome ? "senang" : "biasa"}
            micLevel={nav.getMicLevel}
            voiceLevel={nav.getVoiceLevel}
            label={STATUS[state] || "Miu-chan"}
          />
        </div>

        {!welcome && STATUS[state] && (
          <p className={styles.status} data-state={state} aria-live="polite">
            {STATUS[state]}
          </p>
        )}

        {caption && (
          <div className={styles.caption} aria-live="polite">
            {nav.assessment && caption.reply && <p className={styles.hintTag}><LightbulbIcon size={12} /> Mode petunjuk · jawaban tetap kamu yang cari</p>}
            {caption.ja && (
              <p className={styles.capJa} lang="ja">
                {caption.ja}
              </p>
            )}
            {caption.id && (
              <p className={styles.capMain}>
                <Reveal text={caption.id} />
              </p>
            )}
          </div>
        )}

        {welcome ? (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={nav.acceptWelcome}>
              Ayo keliling!
            </button>
            <button type="button" className={styles.ghost} onClick={nav.skipWelcome}>
              Lewati
            </button>
          </div>
        ) : (
          <>
            {typing && (
              <form className={styles.form} onSubmit={submit}>
                <input
                  ref={inputRef}
                  className={styles.input}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={nav.assessment ? "Tanya soal ini, aku beri petunjuk…" : "Ketik pertanyaan atau mau ke mana…"}
                  aria-label="Ketik untuk Miu-chan"
                />
                <button type="submit" className={styles.send} aria-label="Kirim">
                  <SendIcon size={16} />
                </button>
              </form>
            )}
            <div className={styles.controls}>
              <button type="button" className={styles.side} onClick={() => setTyping((v) => !v)} aria-pressed={typing}>
                <KeyboardIcon size={20} />
                <span>Ketik</span>
              </button>
              <button
                type="button"
                className={styles.mic}
                data-on={listening || undefined}
                onClick={nav.toggleListening}
                disabled={busy}
                aria-label={listening ? "Selesai bicara" : "Bicara lagi"}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  {listening ? (
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                  ) : (
                    <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
                  )}
                </svg>
              </button>
              <button type="button" className={styles.side} onClick={nav.closeStage}>
                <CheckIcon size={20} />
                <span>Selesai</span>
              </button>
            </div>
            <p className={styles.hint}>{listening ? "Ketuk kotak merah kalau sudah selesai bicara" : "Bahasa Indonesia atau Jepang, dua-duanya boleh"}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
