"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, PawIcon } from "@/shared/ui/icons";
import { ChibiMascot } from "@/shared/ui/neko/ChibiMascot";
import { TransitionLink } from "@/shared/ui/ViewTransitions";
import styles from "./auth.module.css";

const WORRIED_MOODS = new Set(["bingung", "sedih", "kesal", "marah", "kaget"]);

const FLOATING_KANA = [
  { ch: "あ", style: { top: "14%", left: "9%", fontSize: "2.6rem", animationDelay: "0s" } },
  { ch: "カ", style: { top: "30%", right: "11%", fontSize: "2rem", animationDelay: "-3s" } },
  { ch: "日", style: { top: "62%", left: "7%", fontSize: "3.2rem", animationDelay: "-6s" } },
  { ch: "の", style: { bottom: "20%", right: "16%", fontSize: "2.3rem", animationDelay: "-1.5s" } },
  { ch: "ミ", style: { top: "8%", right: "30%", fontSize: "1.6rem", animationDelay: "-4.5s" } },
];

function parseBubble(text?: string) {
  // Format "日本語 (Terjemahan)"
  const match = text ? text.match(/^([^(（]+)(?:[(（](.*)[)）])?$/) : null;
  return {
    jp: match ? match[1].trim() : text,
    id: match && match[2] ? match[2].trim() : null,
  };
}

export function AuthCard({
  title,
  japaneseTitle,
  lead,
  bubbleText,
  mood = "senang",
  children,
}: {
  title: string;
  japaneseTitle?: string;
  lead?: string;
  bubbleText?: string;
  /** Ekspresi Miu-chan (nama file /neko/maskot-<mood>.webp). */
  mood?: string;
  children: React.ReactNode;
}) {
  const bubble = parseBubble(bubbleText);
  const worried = WORRIED_MOODS.has(mood);
  const [typingPassword, setTypingPassword] = useState(false);
  const [pokes, setPokes] = useState(0);
  const [talks, setTalks] = useState(0);

  // Miu-chan "berbicara" setiap kali isi gelembungnya berganti
  useEffect(() => {
    if (bubbleText) setTalks((n) => n + 1);
  }, [bubbleText]);

  function onPanelFocus(e: React.FocusEvent<HTMLElement>) {
    setTypingPassword(e.target instanceof HTMLInputElement && e.target.type === "password");
  }

  const faceMood = typingPassword ? "malu" : mood;
  const bubbleKey = typingPassword ? "peek" : bubbleText;

  return (
    <main className={styles.page}>
      <div className={styles.sakuraContainer} aria-hidden="true">
        <span className={styles.petal} style={{ left: "6%", animationDuration: "11s, 3.2s", animationDelay: "0s" }} />
        <span className={styles.petal} style={{ left: "20%", animationDuration: "14s, 4s", animationDelay: "2.5s" }} />
        <span className={styles.petal} style={{ left: "42%", animationDuration: "12s, 3.8s", animationDelay: "1.2s" }} />
        <span className={styles.petal} style={{ left: "64%", animationDuration: "13s, 3.5s", animationDelay: "0.5s" }} />
        <span className={styles.petal} style={{ left: "78%", animationDuration: "15s, 4.5s", animationDelay: "3s" }} />
        <span className={styles.petal} style={{ left: "92%", animationDuration: "10s, 2.8s", animationDelay: "1.8s" }} />
      </div>

      {/* ──────── Panel maskot (desktop) ──────── */}
      <aside className={styles.stage}>
        <div className={styles.stageDecor} aria-hidden="true">
          <div className={styles.stageSun} />
          <svg className={styles.stageRings} viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="0.6" />
            <circle cx="100" cy="100" r="82" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 5" />
          </svg>
          <span className={styles.stageWatermark} lang="ja">日本語</span>
          {FLOATING_KANA.map((k) => (
            <span key={k.ch} className={styles.floatingKana} style={k.style} lang="ja">
              {k.ch}
            </span>
          ))}
          <svg className={styles.stageWaves} viewBox="0 0 400 60" preserveAspectRatio="none">
            <path d="M0 30 Q 50 0 100 30 T 200 30 T 300 30 T 400 30 V60 H0 Z" fill="currentColor" />
          </svg>
        </div>

        <TransitionLink href="/" className={styles.stageBrand} title="Kembali ke halaman utama">
          <Image src="/app-icon.png" alt="" width={40} height={40} className={styles.stageBrandIcon} />
          <span className={styles.stageBrandText}>
            <strong>Nihongo</strong>
            <span lang="ja">日本語 × ミウちゃん</span>
          </span>
        </TransitionLink>

        <div className={styles.stageCenter}>
          {bubble.jp && (
            <div key={bubbleKey} className={styles.stageBubble} data-worried={worried || undefined} role="status">
              {typingPassword ? (
                <>
                  <span className={styles.stageBubbleJp} lang="ja">見てないよ〜！</span>
                  <span className={styles.stageBubbleId}>Tenang, aku nggak ngintip kok!</span>
                </>
              ) : (
                <>
                  <span className={styles.stageBubbleJp} lang="ja">{bubble.jp}</span>
                  {bubble.id && <span className={styles.stageBubbleId}>{bubble.id}</span>}
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className={styles.stageMascotBtn}
            onClick={() => setPokes((n) => n + 1)}
            aria-label="Sentuh Miu-chan"
          >
            <ChibiMascot
              alt="Miu-chan"
              pokeSignal={pokes}
              talkSignal={talks}
              eyesClosed={typingPassword}
              className={styles.stageMascot}
              priority
            />
          </button>
          <div className={styles.stageShadow} aria-hidden="true" />
        </div>

        <div className={styles.stageFooter}>
          <p className={styles.stageTagline} lang="ja">一歩ずつ、一緒に。</p>
          <p className={styles.stageTaglineId}>Selangkah demi selangkah, belajar bareng Miu-chan.</p>
        </div>
      </aside>

      {/* ──────── Panel form ──────── */}
      <section className={styles.panel} onFocus={onPanelFocus} onBlur={() => setTypingPassword(false)}>
        <header className={styles.topNav}>
          <TransitionLink href="/" className={styles.backLink} title="Kembali ke halaman utama">
            <ArrowLeftIcon size={16} />
            <span>Beranda</span>
          </TransitionLink>
          <TransitionLink href="/" className={styles.brandBadge} title="Nihongo">
            <Image src="/app-icon.png" alt="Nihongo" width={32} height={32} className={styles.brandIcon} />
            <span className={styles.brandText}>Nihongo</span>
          </TransitionLink>
        </header>

        <div className={styles.card}>
          <div className={styles.cardAccentBar} aria-hidden="true" />

          <div className={styles.header}>
            {/* Maskot ringkas untuk layar kecil; di desktop maskot ada di panel kiri */}
            <div className={styles.mobileMascot}>
              {bubble.jp && (
                <div key={bubbleKey} className={styles.speechBubble} data-worried={worried || undefined}>
                  <span className={styles.bubblePaw} aria-hidden="true">
                    <PawIcon size={14} />
                  </span>
                  <div className={styles.bubbleContent}>
                    <span className={styles.bubbleJp} lang="ja">
                      {typingPassword ? "見てないよ〜！" : bubble.jp}
                    </span>
                    {(typingPassword || bubble.id) && (
                      <span className={styles.bubbleTranslation}>
                        {typingPassword ? "Aku nggak ngintip kok!" : bubble.id}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className={styles.mascotWrapper}>
                <div className={styles.mascotAura} />
                <Image
                  key={faceMood}
                  src={`/neko/maskot-${faceMood}.webp`}
                  alt="Miu-chan"
                  width={96}
                  height={96}
                  className={styles.mascotImg}
                  priority
                />
              </div>
            </div>

            <div className={styles.titleArea}>
              {japaneseTitle && (
                <span className={styles.japaneseBadge} lang="ja">
                  {japaneseTitle}
                </span>
              )}
              <h1 className={styles.title}>{title}</h1>
              {lead && <p className={styles.lead}>{lead}</p>}
            </div>
          </div>

          <div className={styles.body}>{children}</div>
        </div>
      </section>
    </main>
  );
}
