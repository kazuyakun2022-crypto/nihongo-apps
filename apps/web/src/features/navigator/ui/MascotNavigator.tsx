"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mascot, type MascotMood } from "@/shared/ui/Mascot";
import { useNotifications } from "@/features/notifications/application/NotificationsProvider";
import { useNavigator, type Caption, type VoiceState } from "../application/NavigatorProvider";
import { pageTourFor } from "../domain/tours";
import { Reveal } from "./Reveal";
import styles from "./navigator.module.css";
import { LightbulbIcon, LockIcon, MoreIcon, SendIcon, SparklesIcon, VolumeIcon, VolumeOffIcon } from "@/shared/ui/icons";

const POS_KEY = "nihongo:navigator-pos";
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
  IDLE_FLOATING: "Ketuk untuk memanggil Miu-chan",
  LISTENING: "Mendengarkan, ketuk lagi untuk selesai",
  THINKING: "Miu-chan sedang berpikir",
  SPEAKING: "Miu-chan sedang bicara",
  NAVIGATING: "Miu-chan mengantarmu",
  SPOTLIGHT_POINT: "Miu-chan menunjukkan tombolnya",
};

function CaptionBubble({
  caption,
  onClose,
  onAsk,
  hintMode,
}: {
  caption: Caption;
  onClose: () => void;
  onAsk: (text: string) => void;
  hintMode: boolean;
}) {
  const [followUp, setFollowUp] = useState("");
  const { markRead } = useNotifications();
  return (
    <div className={styles.bubble} role="status" aria-live="polite" data-refusal={caption.refusal || undefined}>
      <button type="button" className={styles.bubbleClose} onClick={onClose} aria-label="Tutup subtitle">
        ×
      </button>
      {caption.refusal && (
        <p className={styles.examTag}>
          <LockIcon size={12} /> Mode ujian
        </p>
      )}
      {hintMode && caption.reply && (
        <p className={styles.hintTag}>
          <LightbulbIcon size={12} /> Mode petunjuk · jawaban tetap kamu yang cari
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
      {caption.action && (
        <div style={{ marginTop: "8px" }}>
          <Link
            href={caption.action.href}
            onClick={() => {
              if (caption.action?.notificationId) void markRead(caption.action.notificationId);
              onClose();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "999px",
              background: "var(--color-primary)",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            {caption.action.label}
          </Link>
        </div>
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
            placeholder={hintMode ? "Minta petunjuk lagi…" : "Tanya lagi…"}
            aria-label="Pertanyaan lanjutan untuk Miu-chan"
          />
          <button type="submit" className={styles.menuSend} aria-label="Kirim">
            <SendIcon size={16} />
          </button>
        </form>
      )}
    </div>
  );
}

/** Saran cepat di menu: memberi tahu pengguna apa saja yang bisa ditanyakan. */
const QUICK_ASKS = ["Aku sedang belajar apa?", "Jelaskan bagian ini", "Jelaskan halaman ini", "Aku harus belajar apa sekarang?"];
/** Saat latihan/kuis: hanya bantuan yang tidak membocorkan jawaban. */
const QUICK_HINTS = ["Maksud soal ini apa?", "Beri aku petunjuk", "Ingatkan materinya", "Aku bingung"];

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
      openStage();
    }
  };

  /** Ketuk: Miu-chan terbang dari posisi widget ke tengah layar dan langsung mendengarkan. */
  const openStage = () => {
    const r = rootRef.current?.querySelector<HTMLElement>(`.${styles.avatar}`)?.getBoundingClientRect();
    setMenuOpen(false);
    nav.openStage(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
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
  // Saat panggung terbuka, teks tampil di panggung, bukan di gelembung pojok
  const showCaption = nav.captionsOn && !nav.stage.open && (nav.caption || nav.micError);
  // Selama tur Miu-chan "pindah" ke kartu penjelas, dan selama panggung terbuka ia ada di tengah layar
  const visible = nav.isWidgetVisible && !nav.tour && !nav.stage.open;
  const pageTour = pageTourFor(pathname);
  const exam = nav.examLocked;
  const hintMode = !!nav.assessment;

  // Portal ke body: leluhur ber-transform (animasi halaman) mematahkan position: fixed
  if (!mounted) return null;
  return createPortal(
    <div
      ref={rootRef}
      className={styles.root}
      style={style}
      data-hidden={!visible || undefined}
      data-state={state}
      data-exam={exam || undefined}
      data-hint={hintMode || undefined}
      aria-hidden={!visible}
    >
      {showCaption && (
        <CaptionBubble
          caption={nav.micError ? { id: nav.micError } : (nav.caption as Caption)}
          onClose={nav.dismissCaption}
          onAsk={(t) => void nav.sendCommand(t)}
          hintMode={hintMode}
        />
      )}

      {menuOpen && !exam && (
        <div className={styles.menu} role="menu">
          <form className={styles.menuForm} onSubmit={submit}>
            <input
              className={styles.menuInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={hintMode ? "Tanya soal ini, aku beri petunjuk…" : "Ketik: cara latihan menulis…"}
              aria-label="Ketik perintah untuk Miu-chan"
              autoFocus
            />
            <button type="submit" className={styles.menuSend} aria-label="Kirim">
              <SendIcon size={16} />
            </button>
          </form>
          <div className={styles.quick}>
            {(hintMode ? QUICK_HINTS : QUICK_ASKS).map((q) => (
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
          {pageTour && !hintMode && (
            <button
              type="button"
              role="menuitem"
              className={styles.menuTour}
              onClick={() => {
                setMenuOpen(false);
                nav.startTour(pageTour);
              }}
            >
              <SparklesIcon size={15} /> Jelaskan halaman ini
            </button>
          )}
          <div className={styles.menuRow}>
            <button type="button" role="menuitem" className={styles.menuBtn} onClick={() => nav.setMuted(!nav.isMuted)}>
              {nav.isMuted ? (
                <>
                  <VolumeOffIcon size={14} /> Suara mati
                </>
              ) : (
                <>
                  <VolumeIcon size={14} /> Suara nyala
                </>
              )}
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
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openStage())}
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
            <LockIcon size={13} />
          </span>
        )}

        {/* Status ditunjukkan lewat animasi kepala; hanya suara mati yang perlu penanda tetap */}
        {nav.isMuted && !exam && (
          <span className={styles.muteBadge} aria-hidden>
            <VolumeOffIcon size={12} strokeWidth={2.4} />
          </span>
        )}

        <button
          type="button"
          className={styles.more}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu Miu-chan"
          aria-expanded={menuOpen}
          tabIndex={visible ? 0 : -1}
        >
          <MoreIcon size={16} strokeWidth={2.6} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
