"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSpeech } from "@/shared/lib/useSpeech";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Mascot } from "@/shared/ui/Mascot";
import styles from "./dailyMission.module.css";

// ── Types ──
type StepId = "map" | "pemanasan" | "pola_baru" | "susun_kalimat" | "tantangan_dengar" | "selesai";

interface DailyMissionProps {
  onBackToCatalog?: () => void;
}

export function DailyMissionView({ onBackToCatalog }: DailyMissionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { speak } = useSpeech();

  // Active step in mission flow
  const [currentStep, setCurrentStep] = useState<StepId>("map");

  // Streak & progress stats
  const streak = user?.streakCount || 7;

  // ── STEP 1: Pemanasan (Warmup Cards) ──
  const WARMUP_CARDS = [
    {
      kanji: "学校",
      furigana: "がっこう",
      romaji: "gakkou",
      meaning: "sekolah",
      options: ["sekolah", "rumah sakit", "stasiun", "kantor"],
    },
    {
      kanji: "先生",
      furigana: "せんせい",
      romaji: "sensei",
      meaning: "guru",
      options: ["murid", "guru", "teman", "dokter"],
    },
    {
      kanji: "日本",
      furigana: "にほん",
      romaji: "nihon",
      meaning: "jepang",
      options: ["indonesia", "jepang", "korea", "amerika"],
    },
  ];
  const [warmupIdx, setWarmupIdx] = useState(0);
  const [selectedWarmupOpt, setSelectedWarmupOpt] = useState<string | null>(null);
  const [warmupIsCorrect, setWarmupIsCorrect] = useState<boolean | null>(null);

  // ── STEP 2: Pola Baru ──
  const [showMeaning, setShowMeaning] = useState(false);

  // ── STEP 3: Susun Kalimat ──
  const SENTENCE_CHIPS = ["たべ", "すしを", "のみ", "たいです", "わたしは"];
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [sentenceChecked, setSentenceChecked] = useState(false);
  const [sentenceIsCorrect, setSentenceIsCorrect] = useState(false);

  // ── STEP 4: Tantangan Dengar ──
  const [audioTimer, setAudioTimer] = useState(15);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [selectedAudioOpt, setSelectedAudioOpt] = useState<string | null>(null);
  const [audioIsCorrect, setAudioIsCorrect] = useState<boolean | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for Step 4
  useEffect(() => {
    if (currentStep === "tantangan_dengar") {
      setAudioTimer(15);
      timerRef.current = setInterval(() => {
        setAudioTimer((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      playAudioChallenge();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep]);

  function playAudioChallenge() {
    setIsAudioPlaying(true);
    speak("おちゃを のみたいです");
    setTimeout(() => setIsAudioPlaying(false), 2200);
  }

  // Handle Warmup Option Click
  function handleSelectWarmup(opt: string) {
    if (selectedWarmupOpt) return;
    setSelectedWarmupOpt(opt);
    const curr = WARMUP_CARDS[warmupIdx];
    const isOk = opt === curr.meaning;
    setWarmupIsCorrect(isOk);

    if (isOk) {
      speak(curr.kanji);
      setTimeout(() => {
        if (warmupIdx + 1 < WARMUP_CARDS.length) {
          setWarmupIdx((prev) => prev + 1);
          setSelectedWarmupOpt(null);
          setWarmupIsCorrect(null);
        } else {
          setCurrentStep("pola_baru");
        }
      }, 900);
    } else {
      setTimeout(() => {
        setSelectedWarmupOpt(null);
        setWarmupIsCorrect(null);
      }, 1200);
    }
  }

  // Handle Sentence Builder Chip Click
  function handleAddChip(chip: string) {
    if (sentenceChecked) return;
    if (selectedChips.includes(chip)) return;
    setSelectedChips([...selectedChips, chip]);
  }

  function handleRemoveChip(chip: string) {
    if (sentenceChecked) return;
    setSelectedChips(selectedChips.filter((c) => c !== chip));
  }

  function checkSentence() {
    // Target sequence: わたしは すしを たべ たいです
    const targetSeq = ["わたしは", "すしを", "たべ", "たいです"];
    const isOk =
      selectedChips.length === targetSeq.length &&
      selectedChips.every((val, i) => val === targetSeq[i]);

    setSentenceChecked(true);
    setSentenceIsCorrect(isOk);

    if (isOk) {
      speak("わたしはすしをたべたいです");
      setTimeout(() => {
        setCurrentStep("tantangan_dengar");
      }, 1100);
    } else {
      setTimeout(() => {
        setSentenceChecked(false);
      }, 1400);
    }
  }

  // Handle Audio Challenge Option
  function handleSelectAudio(opt: string) {
    if (selectedAudioOpt) return;
    setSelectedAudioOpt(opt);
    const isOk = opt === "おちゃ";
    setAudioIsCorrect(isOk);

    if (isOk) {
      speak("せいかい！おつかれさま！");
      setTimeout(() => {
        setCurrentStep("selesai");
      }, 1000);
    } else {
      setTimeout(() => {
        setSelectedAudioOpt(null);
        setAudioIsCorrect(null);
      }, 1200);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SCREEN 1 - MAP SCREEN (Responsive Desktop & Mobile)
  // ─────────────────────────────────────────────────────────────
  if (currentStep === "map") {
    return (
      <div className={styles.container}>
        {/* Mode Tabs: Misi Hari Ini vs Semua Bab */}
        {onBackToCatalog && (
          <div className={styles.modeTabs}>
            <button className={`${styles.modeTabBtn} ${styles.modeTabBtnActive}`}>
              Misi Hari Ini
            </button>
            <button className={styles.modeTabBtn} onClick={onBackToCatalog}>
              Semua Bab (N5-N1)
            </button>
          </div>
        )}

        <div className={styles.hubGrid}>
          {/* Main Column: Header, Mascot Banner, Winding Map Card */}
          <div className={styles.mapMainArea}>
            <div className={styles.mapHeader}>
              <h1 className={styles.mapTitle}>Misi hari ini</h1>
              <div className={styles.streakPill}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                <span>{streak} hari berturut</span>
              </div>
            </div>

            {/* Mascot Encouragement Speech */}
            <div className={styles.mascotBanner}>
              <div className={styles.mascotAvatarWrap}>
                <Mascot mood="senang" size={54} />
              </div>
              <div className={styles.mascotTextWrap}>
                <p className={styles.mascotSpeechJa} lang="ja">
                  きょうも がんばろう！
                </p>
                <p className={styles.mascotSpeechId}>
                  Semangat hari ini! Cuma 10 menit, kok.
                </p>
              </div>
            </div>

            {/* Winding Trail Map Card */}
            <div className={styles.trailMapCard}>
              <div className={styles.trailMap}>
                {/* Connecting Dashed Curve SVG */}
                <svg className={styles.trailSvg} viewBox="0 0 360 520" preserveAspectRatio="none">
                  <path
                    className={styles.trailPath}
                    d="M 110,60 Q 260,110 240,165 T 120,270 T 230,375 T 180,480"
                  />
                </svg>

                {/* Node 1: Pemanasan (Active) */}
                <button
                  className={`${styles.trailNodeItem} ${styles.nodeAlignLeft}`}
                  onClick={() => setCurrentStep("pemanasan")}
                >
                  <div className={`${styles.nodeCircle} ${styles.nodeActive}`}>
                    <span style={{ fontSize: "1.5rem", marginLeft: "3px" }}>▶</span>
                  </div>
                  <div className={styles.nodeInfo}>
                    <p className={styles.nodeName}>Pemanasan</p>
                    <p className={styles.nodeDuration}>Review kosakata 2 menit</p>
                  </div>
                </button>

                {/* Node 2: Pola Baru */}
                <button
                  className={`${styles.trailNodeItem} ${styles.nodeAlignRight}`}
                  onClick={() => setCurrentStep("pola_baru")}
                >
                  <div className={`${styles.nodeCircle} ${styles.nodeLocked}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className={styles.nodeInfo} style={{ textAlign: "right" }}>
                    <p className={styles.nodeName}>Pola baru</p>
                    <p className={styles.nodeDuration}>Tata bahasa 〜たいです</p>
                  </div>
                </button>

                {/* Node 3: Susun Kalimat */}
                <button
                  className={`${styles.trailNodeItem} ${styles.nodeAlignLeft}`}
                  onClick={() => setCurrentStep("susun_kalimat")}
                >
                  <div className={`${styles.nodeCircle} ${styles.nodeLocked}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div className={styles.nodeInfo}>
                    <p className={styles.nodeName}>Susun kalimat</p>
                    <p className={styles.nodeDuration}>Latihan interaktif 3 menit</p>
                  </div>
                </button>

                {/* Node 4: Tantangan Dengar */}
                <button
                  className={`${styles.trailNodeItem} ${styles.nodeAlignRight}`}
                  onClick={() => setCurrentStep("tantangan_dengar")}
                >
                  <div className={`${styles.nodeCircle} ${styles.nodeLocked}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    </svg>
                  </div>
                  <div className={styles.nodeInfo} style={{ textAlign: "right" }}>
                    <p className={styles.nodeName}>Tantangan dengar</p>
                    <p className={styles.nodeDuration}>Uji pendengaran cepat</p>
                  </div>
                </button>

                {/* Node 5: Peti Hadiah */}
                <button
                  className={`${styles.trailNodeItem} ${styles.nodeAlignCenter}`}
                  onClick={() => setCurrentStep("selesai")}
                >
                  <div className={styles.nodeRewardBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 12 20 22 4 22 4 12" />
                      <rect x="2" y="7" width="20" height="5" />
                      <line x1="12" y1="22" x2="12" y2="7" />
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                    </svg>
                  </div>
                  <div className={styles.nodeInfo}>
                    <p className={styles.nodeName}>Peti hadiah</p>
                    <p className={styles.nodeDuration}>Stiker baru untuk Neko</p>
                  </div>
                </button>
              </div>

              {/* Start Mission Button inside card / bottom bar */}
              <div className={styles.bottomCtaBar}>
                <button className={styles.startMissionBtn} onClick={() => setCurrentStep("pemanasan")}>
                  <span>Mulai misi hari ini</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Companion Sidebar (Visible on >= 1024px) */}
          <aside className={styles.desktopSidebar}>
            {/* Mission Overview Card */}
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarCardTitle}>
                <span>Target Belajar Hari Ini</span>
              </h3>
              <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                Selesaikan 5 langkah belajar harian untuk menjaga konsistensi dan membuka reward spesial.
              </p>

              <ul className={styles.stepsChecklist}>
                <li className={`${styles.stepCheckItem} ${styles.stepCheckItemActive}`}>
                  <span className={styles.stepIconBadge}>1</span>
                  <div style={{ flex: 1 }}>
                    <strong>Pemanasan</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Review kosakata dasar</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}>Mulai</span>
                </li>

                <li className={styles.stepCheckItem}>
                  <span className={styles.stepIconBadge}>2</span>
                  <div style={{ flex: 1 }}>
                    <span>Pola Baru</span>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Tata bahasa 〜たいです</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Terkunci</span>
                </li>

                <li className={styles.stepCheckItem}>
                  <span className={styles.stepIconBadge}>3</span>
                  <div style={{ flex: 1 }}>
                    <span>Susun Kalimat</span>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Latihan susun chip kata</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Terkunci</span>
                </li>

                <li className={styles.stepCheckItem}>
                  <span className={styles.stepIconBadge}>4</span>
                  <div style={{ flex: 1 }}>
                    <span>Tantangan Dengar</span>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Uji audio pelafalan</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Terkunci</span>
                </li>

                <li className={styles.stepCheckItem}>
                  <span className={styles.stepIconBadge}>5</span>
                  <div style={{ flex: 1 }}>
                    <span>Peti Hadiah</span>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Stiker Neko Yukata & +45 XP</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Terkunci</span>
                </li>
              </ul>
            </div>

            {/* Streak & Discipline Widget */}
            <div className={styles.sidebarCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className={styles.sidebarCardTitle}>
                  <span>Streak {streak} Hari</span>
                </h3>
                <span style={{ fontSize: "0.75rem", color: "#3f7d32", fontWeight: "bold" }}>Konsisten!</span>
              </div>
              <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                Belajar 10 menit setiap hari membantu daya ingat jangka panjang bertahan hingga 85% lebih kuat.
              </p>
            </div>

            {/* Sticker Collection Widget */}
            <div className={styles.sidebarCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "bold" }}>
                    Koleksi Stiker Neko
                  </h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    Kostum Yukata Festival (3/5 stiker)
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SCREEN 2 - STEP 1 (Pemanasan Flashcard Quiz)
  // ─────────────────────────────────────────────────────────────
  if (currentStep === "pemanasan") {
    const card = WARMUP_CARDS[warmupIdx];

    return (
      <div className={styles.questWrap}>
        <div className={styles.questTopBar}>
          <button className={styles.closeQuestBtn} onClick={() => setCurrentStep("map")} aria-label="Tutup">
            ✕
          </button>
          <div className={styles.segmentedProgress}>
            <div className={`${styles.progressSegment} ${styles.progressSegmentActive}`} />
            <div className={styles.progressSegment} />
            <div className={styles.progressSegment} />
            <div className={styles.progressSegment} />
            <div className={styles.progressSegment} />
          </div>
          <div className={styles.questBadge}>Kombo x2</div>
        </div>

        <div className={styles.questBody}>
          <p className={styles.questStepTag}>
            Pemanasan, kartu {warmupIdx + 1} dari {WARMUP_CARDS.length}
          </p>
          <h2 className={styles.questQuestion}>Apa arti kata ini?</h2>

          <div className={styles.step1ResponsiveGrid}>
            <div className={styles.step1CardCol}>
              <div
                className={styles.flashcardHero}
                onClick={() => speak(card.kanji)}
                style={{ cursor: "pointer" }}
                title="Ketuk untuk mendengar pelafalan"
              >
                <h1 className={styles.flashcardKanji} lang="ja">
                  {card.kanji}
                </h1>
                <p className={styles.flashcardFurigana} lang="ja">
                  {card.furigana}
                </p>
                <span className={styles.flashcardAudioHint}>
                  Ketuk untuk dengar pelafalan
                </span>
              </div>

              <div className={styles.stepCompanionTip}>
                <Mascot mood="semangat" size={44} />
                <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  <strong>Miu-chan:</strong> Dengarkan suaranya dan pilih arti bahasa Indonesia yang paling tepat!
                </p>
              </div>
            </div>

            <div className={styles.step1OptionsCol}>
              <div className={styles.optionsGrid2x2}>
                {card.options.map((opt, idx) => {
                  const isSelected = selectedWarmupOpt === opt;
                  let btnClass = styles.optionTileBtn;
                  if (isSelected) {
                    btnClass = `${styles.optionTileBtn} ${
                      warmupIsCorrect ? styles.optionTileBtnCorrect : styles.optionTileBtnWrong
                    }`;
                  }
                  return (
                    <button
                      key={opt}
                      className={btnClass}
                      onClick={() => handleSelectWarmup(opt)}
                    >
                      <span className={styles.optionIndexPill}>{idx + 1}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <div className={styles.stepKeyboardHint}>
                <span>Tip: Di layar tablet & desktop, ketuk pilihan untuk langsung memvalidasi jawaban</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SCREEN 3 - STEP 2 (Pola Baru Grammar - Responsive Split)
  // ─────────────────────────────────────────────────────────────
  if (currentStep === "pola_baru") {
    return (
      <div className={styles.questWrap}>
        <div className={styles.questTopBar}>
          <button className={styles.closeQuestBtn} onClick={() => setCurrentStep("map")} aria-label="Tutup">
            ✕
          </button>
          <div className={styles.segmentedProgress}>
            <div className={`${styles.progressSegment} ${styles.progressSegmentFilled}`} />
            <div className={`${styles.progressSegment} ${styles.progressSegmentActive}`} />
            <div className={styles.progressSegment} />
            <div className={styles.progressSegment} />
            <div className={styles.progressSegment} />
          </div>
          <div className={styles.questBadge}>⭐ +15 XP</div>
        </div>

        <div className={styles.questBody}>
          <p className={styles.questStepTag}>Pola baru, N5 bab 3</p>

          <div className={styles.step2ResponsiveGrid}>
            {/* Left Column: Pattern Hero */}
            <div className={styles.grammarHeroCard}>
              <h1 className={styles.grammarPatternTitle} lang="ja">
                〜たいです
              </h1>
              <p className={styles.grammarPatternMeaning}>ingin melakukan sesuatu</p>
              <p className={styles.grammarRuleText}>
                Ganti akhiran <strong>〜ます</strong> pada kata kerja dengan <strong>〜たいです</strong>.
              </p>
              <div className={styles.grammarFormulaBox}>
                <span lang="ja">たべます</span>
                <span className={styles.grammarFormulaArrow}>➔</span>
                <span lang="ja">たべたいです</span>
              </div>
            </div>

            {/* Right Column: Examples + Tip */}
            <div className={styles.step2ExamplesCol}>
              {/* Example 1 */}
              <div
                className={styles.exampleCard}
                onClick={() => speak("すしをたべたいです")}
              >
                <button className={styles.exampleAudioBtn} aria-label="Putar audio">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
                <div>
                  <p className={styles.exampleJapanese} lang="ja">
                    すしを たべたいです。
                  </p>
                  {showMeaning && <p className={styles.exampleMeaning}>Saya ingin makan sushi.</p>}
                </div>
              </div>

              {/* Example 2 */}
              <div
                className={styles.exampleCard}
                onClick={() => speak("にほんへいきたいです")}
              >
                <button className={styles.exampleAudioBtn} aria-label="Putar audio">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
                <div>
                  <p className={styles.exampleJapanese} lang="ja">
                    にほんへ いきたいです。
                  </p>
                  {showMeaning && <p className={styles.exampleMeaning}>Saya ingin pergi ke Jepang.</p>}
                </div>
              </div>

              <button
                className={styles.toggleMeaningBtn}
                onClick={() => setShowMeaning((prev) => !prev)}
              >
                {showMeaning ? "✕ Sembunyikan arti" : "Tampilkan arti kalimat"}
              </button>

              <div className={styles.nekoTipCard}>
                <Mascot mood="berpikir" size={40} />
                <p className={styles.nekoTipText}>
                  <strong>Tips Neko:</strong> untuk menyatakan keinginan orang lain, jangan gunakan たい. Pola itu akan dipelajari di materi lanjutan!
                </p>
              </div>
            </div>
          </div>
        </div>

        <button className={styles.startMissionBtn} onClick={() => setCurrentStep("susun_kalimat")}>
          <span>Coba sendiri ➔</span>
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SCREEN 4 - STEP 3 (Susun Kalimat / Sentence Builder)
  // ─────────────────────────────────────────────────────────────
  if (currentStep === "susun_kalimat") {
    return (
      <div className={styles.questWrap}>
        <div className={styles.questTopBar}>
          <button className={styles.closeQuestBtn} onClick={() => setCurrentStep("map")} aria-label="Tutup">
            ✕
          </button>
          <div className={styles.segmentedProgress}>
            <div className={`${styles.progressSegment} ${styles.progressSegmentFilled}`} />
            <div className={`${styles.progressSegment} ${styles.progressSegmentFilled}`} />
            <div className={`${styles.progressSegment} ${styles.progressSegmentActive}`} />
            <div className={styles.progressSegment} />
            <div className={styles.progressSegment} />
          </div>
          <div className={styles.questBadge}>+25 XP</div>
        </div>

        <div className={styles.questBody}>
          <p className={styles.questStepTag}>Latihan menyusun kalimat</p>
          <h2 className={styles.questQuestion}>Susun kalimat yang tepat</h2>

          <div className={styles.step3ResponsiveGrid}>
            {/* Left Column: Target Prompt & Sentence Drop Zone */}
            <div className={styles.step3LeftCol}>
              <div className={styles.mascotBanner}>
                <Mascot mood="semangat" size={54} />
                <div className={styles.mascotTextWrap}>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>
                    Susun dalam bahasa Jepang:
                  </p>
                  <p style={{ fontSize: "1.15rem", fontWeight: "bold", margin: "2px 0 0 0" }}>
                    &ldquo;Saya ingin makan sushi.&rdquo;
                  </p>
                </div>
              </div>

              {/* Construction Slot */}
              <div className={styles.sentenceBuilderBox}>
                {selectedChips.length === 0 ? (
                  <span className={styles.placeholderPrompt}>
                    Ketuk kata di panel pilihan untuk menyusun kalimat...
                  </span>
                ) : (
                  selectedChips.map((chip) => (
                    <button
                      key={chip}
                      className={`${styles.wordChipBtn} ${styles.wordChipSelected}`}
                      onClick={() => handleRemoveChip(chip)}
                      title="Ketuk untuk menghapus"
                      lang="ja"
                    >
                      {chip}
                    </button>
                  ))
                )}
              </div>

              {sentenceChecked && (
                <div
                  className={`${styles.validationBanner} ${
                    sentenceIsCorrect ? styles.validationCorrect : styles.validationWrong
                  }`}
                >
                  <span>{sentenceIsCorrect ? "Bagus sekali! Susunan kalimat benar!" : "Kurang tepat, perhatikan susunan kata kerja yuk!"}</span>
                </div>
              )}
            </div>

            {/* Right Column: Words Pool & Actions */}
            <div className={styles.step3RightCol}>
              <p style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--color-text-muted)", margin: 0 }}>
                Pilihan Kata:
              </p>
              <div className={styles.wordChipsPool}>
                {SENTENCE_CHIPS.map((chip) => {
                  const isUsed = selectedChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      className={`${styles.wordChipBtn} ${isUsed ? styles.wordChipUsedInPool : ""}`}
                      onClick={() => handleAddChip(chip)}
                      disabled={isUsed || sentenceChecked}
                      lang="ja"
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

              <div className={styles.step3Actions}>
                {selectedChips.length > 0 && !sentenceChecked && (
                  <button
                    className={styles.resetChipsBtn}
                    onClick={() => setSelectedChips([])}
                  >
                    Mulai Ulang
                  </button>
                )}
                <button
                  className={styles.startMissionBtn}
                  onClick={checkSentence}
                  disabled={selectedChips.length === 0 || sentenceChecked}
                  style={{ flex: 1, opacity: selectedChips.length === 0 ? 0.5 : 1 }}
                >
                  <span>Periksa Jawaban ✓</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SCREEN 5 - STEP 4 (Tantangan Dengar - Responsive Split)
  // ─────────────────────────────────────────────────────────────
  if (currentStep === "tantangan_dengar") {
    return (
      <div className={styles.questWrap}>
        <div className={styles.questTopBar}>
          <button className={styles.closeQuestBtn} onClick={() => setCurrentStep("map")} aria-label="Tutup">
            ✕
          </button>
          <div className={styles.segmentedProgress}>
            <div className={`${styles.progressSegment} ${styles.progressSegmentFilled}`} />
            <div className={`${styles.progressSegment} ${styles.progressSegmentFilled}`} />
            <div className={`${styles.progressSegment} ${styles.progressSegmentFilled}`} />
            <div className={`${styles.progressSegment} ${styles.progressSegmentActive}`} />
            <div className={styles.progressSegment} />
          </div>
          <div className={styles.questBadge}>+35 XP</div>
        </div>

        <div className={styles.questBody}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className={styles.questStepTag}>Tantangan cepat</p>
            <div className={styles.countdownRingWrap}>
              <span>0:{audioTimer < 10 ? `0${audioTimer}` : audioTimer}</span>
            </div>
          </div>

          <h2 className={styles.questQuestion}>Dengarkan, lalu jawab</h2>

          <div className={styles.step4ResponsiveGrid}>
            {/* Left Column: Audio Player Card */}
            <div className={styles.audioChallengeHero}>
              <button
                className={styles.audioPlayCircle}
                onClick={playAudioChallenge}
                aria-label="Putar audio pertanyaan"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </button>

              <div className={`${styles.soundwave} ${isAudioPlaying ? styles.soundwavePlaying : ""}`}>
                <div className={styles.soundwaveBar} />
                <div className={styles.soundwaveBar} />
                <div className={styles.soundwaveBar} />
                <div className={styles.soundwaveBar} />
                <div className={styles.soundwaveBar} />
              </div>

              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>
                Ketuk untuk mendengar pelafalan
              </span>
            </div>

            {/* Right Column: Question & Options */}
            <div>
              <p style={{ fontWeight: "bold", fontSize: "1.1rem", margin: "0 0 var(--space-3) 0" }}>
                Apa yang ingin dia minum?
              </p>

              <div className={styles.audioOptionsList}>
                {[
                  { ja: "おちゃ", id: "teh hijau" },
                  { ja: "コーヒー", id: "kopi" },
                  { ja: "みず", id: "air putih" },
                ].map(({ ja, id }) => {
                  const isSelected = selectedAudioOpt === ja;
                  let borderStyle = undefined;
                  if (isSelected) {
                    borderStyle = audioIsCorrect ? "2px solid #3f7d32" : "2px solid var(--color-primary)";
                  }

                  return (
                    <button
                      key={ja}
                      className={styles.audioOptionRowBtn}
                      onClick={() => handleSelectAudio(ja)}
                      style={{ border: borderStyle }}
                    >
                      <span className={styles.audioOptionJa} lang="ja">
                        {ja}
                      </span>
                      <span className={styles.audioOptionId}>{id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SCREEN 6 - STEP 5 (Peti Hadiah & Selesai - Responsive)
  // ─────────────────────────────────────────────────────────────
  if (currentStep === "selesai") {
    return (
      <div className={styles.container}>
        <div className={styles.completionWrap}>
          {/* Celebratory Mascot & Title */}
          <Mascot mood="semangat" size={96} />
          <p className={styles.cheerBubble} lang="ja">
            おつかれさま！
          </p>
          <h1 className={styles.completionTitle}>● Misi hari ini selesai</h1>

          <div className={styles.step5ResponsiveGrid}>
            {/* Left Column: Stats & Streak */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* 3 Stats Row */}
              <div className={styles.statsPillsRow}>
                <div className={styles.statPillCard}>
                  <span className={styles.statPillValue}>+45</span>
                  <span className={styles.statPillLabel}>XP</span>
                </div>
                <div className={styles.statPillCard}>
                  <span className={styles.statPillValue}>10</span>
                  <span className={styles.statPillLabel}>menit</span>
                </div>
                <div className={styles.statPillCard}>
                  <span className={styles.statPillValue}>92%</span>
                  <span className={styles.statPillLabel}>benar</span>
                </div>
              </div>

              {/* Streak 7-Day Calendar */}
              <div className={styles.streakCalendarCard}>
                <div className={styles.streakCalendarHeader}>
                  <span>{streak + 1} hari berturut-turut</span>
                  <span style={{ color: "#3f7d32" }}>Rekor baru!</span>
                </div>
                <div className={styles.streakDaysList}>
                  {[
                    { name: "Sen", done: true },
                    { name: "Sel", done: true },
                    { name: "Rab", done: true },
                    { name: "Kam", done: true },
                    { name: "Jum", done: true, today: true },
                    { name: "Sab", done: false },
                    { name: "Min", done: false },
                  ].map((d) => (
                    <div key={d.name} className={styles.streakDayCol}>
                      <div
                        className={`${styles.streakDayDot} ${
                          !d.done ? styles.streakDayDotInactive : ""
                        } ${d.today ? styles.streakDayDotToday : ""}`}
                      >
                        {d.done ? "✓" : ""}
                      </div>
                      <span className={styles.streakDayName}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Sticker Reward & Teaser */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Sticker Reward Card */}
              <div className={styles.stickerRewardCard}>
                <div>
                  <p className={styles.stickerTitle}>Stiker baru: Neko pakai yukata</p>
                  <p className={styles.stickerDesc}>
                    3 dari 5 stiker terkumpul! Kostum festival akan terbuka di stiker ke-5.
                  </p>
                </div>
              </div>

              <p className={styles.tomorrowTeaser}>
                Besok: pola <strong>〜ましょう</strong> untuk mengajak teman
              </p>

              {/* Bonus Action: Chat with AI */}
              <Link href="/ngobrol" className={styles.bonusActionBtn}>
                <span>Bonus: ngobrol pakai 〜たい</span>
              </Link>

              <button className={styles.returnHomeLink} onClick={() => router.push("/beranda")}>
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
