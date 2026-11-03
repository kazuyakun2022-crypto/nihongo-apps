"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Mascot, type MascotMood } from "@/shared/ui/Mascot";
import { useNavigator, type Caption, type VoiceState } from "../application/NavigatorProvider";
import { pageTourFor, type TourKey } from "../domain/tours";
import { Reveal } from "./Reveal";
import styles from "./navigator.module.css";

const POS_KEY = "nihongo:navigator-pos";
/** Halaman yang sudah pernah ditawari tur, supaya tawaran hanya muncul sekali per halaman. */
const OFFERED_KEY = "nihongo:navigator-offered";

function readOffered(): string[] {
  try {
    return JSON.parse(localStorage.getItem(OFFERED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function markOffered(key: string) {
  try {
    localStorage.setItem(OFFERED_KEY, JSON.stringify([...new Set([...readOffered(), key])]));
  } catch {
    /* abaikan */
  }
}
const DRAG_THRESHOLD = 6;

const MOOD: Record<VoiceState, MascotMood> = {
  IDLE_FLOATING: "senang",
  LISTENING: "senang",
  THINKING: "berpikir",
  SPEAKING: "senang",
  NAVIGATING: "semangat",
  SPOTLIGHT_POINT: "semangat",
};

const STATE_LABEL: Record<VoiceState, string> = {
  IDLE_FLOATING: "Ketuk untuk bicara dengan Miu-chan",
  LISTENING: "Mendengarkan, ketuk lagi untuk selesai",
  THINKING: "Miu-chan sedang berpikir",
  SPEAKING: "Miu-chan sedang bicara",
  NAVIGATING: "Miu-chan mengantarmu",
  SPOTLIGHT_POINT: "Miu-chan menunjukkan tombolnya",
};

function CaptionBubble({ caption, onClose, onAsk }: { caption: Caption; onClose: () => void; onAsk: (text: string) => void }) {
  const [followUp, setFollowUp] = useState("");
  return (
    <div className={styles.bubble} role="status" aria-live="polite" data-refusal={caption.refusal || undefined}>
      <button type="button" className={styles.bubbleClose} onClick={onClose} aria-label="Tutup subtitle">
        ×
      </button>
      {caption.refusal && (
        <p className={styles.examTag}>
          <span aria-hidden>🔒</span> Mode ujian
        </p>
      )}
      {caption.ja && (
        <p className={styles.capJa} lang="ja">
          <Reveal text={caption.ja} />
        </p>
      )}
      {caption.romaji && <p className={styles.capRomaji}>{caption.romaji}</p>}
      {caption.id && (
        <p className={caption.ja ? styles.capId : styles.capMain}>
          {caption.ja ? caption.id : <Reveal text={caption.id} />}
        </p>
      )}
      {caption.reply && (
        <form
          className={styles.followUp}
          onSubmit={(e) => {
            e.preventDefault();
            const t = followUp.trim();
            if (!t) return;
            setFollowUp("");
            onAsk(t);
          }}
        >
          <input
            className={styles.menuInput}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="Tanya lagi…"
            aria-label="Pertanyaan lanjutan untuk Miu-chan"
          />
          <button type="submit" className={styles.menuSend} aria-label="Kirim">
            ➤
          </button>
        </form>
      )}
    </div>
  );
}

/** Saran cepat di menu: memberi tahu pengguna apa saja yang bisa ditanyakan. */
const QUICK_ASKS = ["Jelaskan halaman ini", "Aku bingung di bagian ini", "Aku harus belajar apa sekarang?", "Mau latihan menulis huruf"];

type Pos = { right: number; bottom: number } | null;

export function MascotNavigator() {
  const nav = useNavigator();
  const [pos, setPos] = useState<Pos>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const drag = useRef<{ x: number; y: number; right: number; bottom: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname() ?? "";
  const [offer, setOffer] = useState<TourKey | null>(null);

  // Pertama kali membuka halaman yang punya tur: Miu-chan menawarkan penjelasan (sekali saja per halaman)
  useEffect(() => {
    setOffer(null);
    const key = pageTourFor(pathname);
    if (!key || !nav.isWidgetVisible || readOffered().includes(key)) return;
    const show = window.setTimeout(() => {
      setOffer(key);
      markOffered(key);
    }, 1600);
    return () => window.clearTimeout(show);
  }, [pathname, nav.isWidgetVisible]);

  useEffect(() => {
    if (!offer) return;
    const hide = window.setTimeout(() => setOffer(null), 14000);
    return () => window.clearTimeout(hide);
  }, [offer]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) setPos(JSON.parse(raw));
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    if (!nav.isWidgetVisible) setMenuOpen(false);
  }, [nav.isWidgetVisible]);

  const clamp = (right: number, bottom: number) => {
    const size = rootRef.current?.querySelector<HTMLElement>(`.${styles.avatar}`)?.offsetWidth ?? 64;
    return {
      right: Math.min(Math.max(8, right), window.innerWidth - size - 8),
      bottom: Math.min(Math.max(8, bottom), window.innerHeight - size - 8),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setPos(clamp(d.right - dx, d.bottom - dy));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      setPos((p) => {
        try {
          if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
        } catch {
          /* abaikan */
        }
        return p;
      });
    } else {
      setOffer(null);
      nav.toggleListening();
    }
  };

  const resetPos = () => {
    setPos(null);
    try {
      localStorage.removeItem(POS_KEY);
    } catch {
      /* abaikan */
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMenuOpen(false);
    void nav.sendCommand(text);
  };

  const state = nav.voiceState;
  const style = pos ? ({ right: pos.right, bottom: pos.bottom } as React.CSSProperties) : undefined;
  const showCaption = nav.captionsOn && (nav.caption || nav.micError);
  // Selama tur, Miu-chan "pindah" ke kartu penjelas; widget melayang disembunyikan
  const visible = nav.isWidgetVisible && !nav.tour;
  const pageTour = pageTourFor(pathname);
  const exam = nav.examLocked;
  const showOffer = !!offer && !exam && !showCaption && !menuOpen && state === "IDLE_FLOATING";

  // Portal ke body: leluhur ber-transform (animasi halaman) mematahkan position: fixed
  if (!mounted) return null;
  return createPortal(
    <div
      ref={rootRef}
      className={styles.root}
      style={style}
      data-hidden={!visible || undefined}
      data-state={state}
      data-offer={showOffer || undefined}
      data-exam={exam || undefined}
      aria-hidden={!visible}
    >
      {showOffer && (
        <div className={styles.bubble} role="status">
          <button type="button" className={styles.bubbleClose} onClick={() => setOffer(null)} aria-label="Tutup">
            ×
          </button>
          {(nav.band === "PRE_N5" || nav.band === "N5") && (
            <p className={styles.capJa} lang="ja">
              せつめい しようか？
            </p>
          )}
          <p className={styles.capMain}>
            <Reveal text="Hai! Mau aku jelaskan isi halaman ini satu per satu?" />
          </p>
          <div className={styles.offerActions}>
            <button
              type="button"
              className={styles.btnMain}
              onClick={() => {
                setOffer(null);
                nav.startTour(offer!);
              }}
            >
              Ya, jelaskan
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => setOffer(null)}>
              Nanti saja
            </button>
          </div>
        </div>
      )}

      {showCaption && (
        <CaptionBubble
          caption={nav.micError ? { id: nav.micError } : (nav.caption as Caption)}
          onClose={nav.dismissCaption}
          onAsk={(t) => void nav.sendCommand(t)}
        />
      )}

      {menuOpen && !exam && (
        <div className={styles.menu} role="menu">
          <form className={styles.menuForm} onSubmit={submit}>
            <input
              className={styles.menuInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ketik: cara latihan menulis…"
              aria-label="Ketik perintah untuk Miu-chan"
              autoFocus
            />
            <button type="submit" className={styles.menuSend} aria-label="Kirim">
              ➤
            </button>
          </form>
          <div className={styles.quick}>
            {QUICK_ASKS.map((q) => (
              <button
                key={q}
                type="button"
                className={styles.quickChip}
                onClick={() => {
                  setMenuOpen(false);
                  void nav.sendCommand(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
          {pageTour && (
            <button
              type="button"
              role="menuitem"
              className={styles.menuTour}
              onClick={() => {
                setMenuOpen(false);
                nav.startTour(pageTour);
              }}
            >
              ✨ Jelaskan halaman ini
            </button>
          )}
          <div className={styles.menuRow}>
            <button type="button" role="menuitem" className={styles.menuBtn} onClick={() => nav.setMuted(!nav.isMuted)}>
              {nav.isMuted ? "🔇 Suara mati" : "🔊 Suara nyala"}
            </button>
            <button type="button" role="menuitem" className={styles.menuBtn} onClick={() => nav.setCaptionsOn(!nav.captionsOn)}>
              {nav.captionsOn ? "Subtitle: nyala" : "Subtitle: mati"}
            </button>
            <button type="button" role="menuitem" className={styles.menuBtn} onClick={resetPos}>
              Reset posisi
            </button>
          </div>
        </div>
      )}

      <div className={styles.avatarWrap}>
        {/* Efek per status */}
        <span className={styles.waves} aria-hidden />
        <span className={styles.thinkBubble} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.sparkles} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.dash} aria-hidden>
          <i />
          <i />
          <i />
        </span>

        <button
          type="button"
          className={styles.avatar}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), nav.toggleListening())}
          aria-label={exam ? "Mode ujian: Miu-chan tidak bisa membantu sekarang" : STATE_LABEL[state]}
          aria-pressed={state === "LISTENING"}
          tabIndex={visible ? 0 : -1}
        >
          <span className={styles.avatarBody}>
            <Mascot mood={exam ? "berpikir" : MOOD[state]} size={80} title="" className={styles.avatarImg} />
          </span>
        </button>
        {exam && (
          <span className={styles.lockBadge} aria-hidden>
            🔒
          </span>
        )}

        <span className={styles.badge} data-mic={nav.isMuted ? "muted" : state === "LISTENING" ? "on" : state === "THINKING" ? "busy" : undefined} aria-hidden />

        <button
          type="button"
          className={styles.more}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu Miu-chan"
          aria-expanded={menuOpen}
          tabIndex={visible ? 0 : -1}
        >
          ⋯
        </button>
      </div>
    </div>,
    document.body,
  );
}
