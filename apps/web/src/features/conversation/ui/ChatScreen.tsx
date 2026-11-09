"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot, type MascotMood } from "@/shared/ui/Mascot";
import {
  ArrowRightIcon,
  CloseIcon,
  MicIcon,
  SendIcon,
  SparklesIcon,
  StopIcon,
  TargetIcon,
  TrophyIcon,
  VolumeIcon,
} from "@/shared/ui/icons";
import { useSpeech } from "@/shared/lib/useSpeech";
import { useConversation } from "../application/useConversation";
import type { ConversationEmotion, DialogueStep, ScenarioItem } from "../domain/types";
import { FuriganaText, stripFurigana } from "./FuriganaText";
import { MicroFeedbackCard } from "./MicroFeedbackCard";
import styles from "./chat.module.css";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

async function transcribeSpeech(audio: Blob): Promise<string> {
  const res = await fetch("/api/ask/transcribe?lang=ja", {
    method: "POST",
    headers: { "content-type": audio.type || "audio/webm" },
    body: audio,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "Gagal mengenali suara.");
  return data.text?.trim() ?? "";
}

/** Emosi balasan AI dipetakan ke ekspresi maskot yang tersedia. */
const MOOD: Record<ConversationEmotion, MascotMood> = {
  playful: "senang",
  encouraging: "semangat",
  thinking: "berpikir",
  excited: "semangat",
};

export function ChatScreen({ scenario = null }: { scenario?: ScenarioItem | null }) {
  const { phase, session, messages, turnsLeft, report, error, emotion, start, send, end } = useConversation();
  const { speak } = useSpeech();
  const scenarioId = scenario?.id ?? null;

  const [draft, setDraft] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showInChatGuide, setShowInChatGuide] = useState(false);
  const [revealedTranslations, setRevealedTranslations] = useState<Record<string, boolean>>({});

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, phase]);

  const script: DialogueStep[] = Array.isArray(scenario?.dialogueScript)
    ? (scenario?.dialogueScript as DialogueStep[])
    : [];

  // Toggle terjemahan per pesan AI
  const toggleTranslation = (msgId: string) => {
    setRevealedTranslations((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Cari arti terjemahan dari dialogueScript jika ada
  const findTranslation = useCallback(
    (text: string) => {
      const clean = stripFurigana(text).trim();
      const match = script.find(
        (s) =>
          s.japaneseText &&
          (clean.includes(stripFurigana(s.japaneseText)) || stripFurigana(s.japaneseText).includes(clean)),
      );
      return match;
    },
    [script],
  );

  // Hitung giliran user saat ini untuk saran dialog cerdas
  const userTurnsCount = messages.filter((m) => m.sender === "user").length;
  const userSteps = script.filter((s) => s.speaker === "USER");
  const currentExpectedStep = userSteps[userTurnsCount] ?? null;

  // ── Perekaman Suara (Mic Input) ──
  const startRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setTranscribing(true);
        try {
          const audioBlob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
          const text = await transcribeSpeech(audioBlob);
          if (text) {
            setDraft((prev) => (prev ? `${prev} ${text}` : text));
            inputRef.current?.focus();
          } else {
            setVoiceError("Suara tidak terdengar jelas. Coba ucapkan lagi.");
          }
        } catch (err: any) {
          setVoiceError(err.message || "Gagal mengenali ucapan.");
        } finally {
          setTranscribing(false);
          setIsRecording(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setVoiceError("Izin mikrofon diperlukan untuk merekam suara.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  };

  // ── 1. LAYAR MULAI SKENARIO (BRIEFING COVER) ──
  if (phase === "idle" || phase === "starting") {
    if (scenario) {
      const imgUrl = scenario.imageUrl || "/images/scenarios/01_Misi_Pertama_di_Konbini.png";
      return (
        <div className={styles.scenarioIntroScroller}>
          <section className={styles.scenarioIntroWrap} aria-label={`Skenario: ${scenario.title}`}>
            <div className={styles.scenarioCard}>
              {/* Cover Banner Hero */}
              <div className={styles.scenarioCover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl} alt={scenario.title} className={styles.scenarioCoverImg} />
                <div className={styles.scenarioCoverOverlay} />
                <div className={styles.scenarioCoverBadges}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Link
                      href="/ngobrol?tab=skenario"
                      className={styles.scenarioCoverBackBtn}
                      aria-label="Kembali ke daftar skenario"
                      title="Kembali ke daftar skenario"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </Link>
                    <span className={styles.scenarioCoverLevel}>{scenario.levelCode}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {scenario.location && (
                      <span className={styles.scenarioCoverLoc}>📍 {scenario.location}</span>
                    )}
                    {scenario.keigoType && (
                      <span className={styles.scenarioCoverLoc}>🗣️ {scenario.keigoType}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Isi Detail Misi */}
              <div className={styles.scenarioCardBody}>
                <h1 className={styles.scenarioTitle}>{scenario.title}</h1>

                {/* Matchup Peran (Duel Roleplay) */}
                <div className={styles.roleMatchupRow}>
                  <div className={styles.roleBox}>
                    <span className={styles.roleTag}>Peranmu</span>
                    <span className={styles.roleName}>{scenario.userRole || "Siswa"}</span>
                  </div>

                  <span className={styles.roleVersus} aria-hidden="true">
                    ⇄
                  </span>

                  <div className={styles.roleBox} style={{ textAlign: "right" }}>
                    <span className={styles.roleTag}>Lawan Bicara AI</span>
                    <span className={styles.roleName}>{scenario.mascotRole || "Miu-chan"}</span>
                  </div>
                </div>

                {/* Target Misi */}
                <div className={styles.scenarioGoalBox}>
                  <span className={styles.scenarioGoalLabel}>
                    <TargetIcon size={16} /> Target Misi Percakapan
                  </span>
                  <p className={styles.scenarioGoalText}>{scenario.goal}</p>
                </div>

                {/* Pola Tata Bahasa Kunci */}
                {scenario.targetGrammar && scenario.targetGrammar.length > 0 && (
                  <div className={styles.scenarioGrammarWrap}>
                    <span className={styles.scenarioGrammarLabel}>Pola Tata Bahasa:</span>
                    {scenario.targetGrammar.map((g) => (
                      <span key={g} className={styles.grammarChip} lang="ja">
                        <FuriganaText text={g} />
                      </span>
                    ))}
                  </div>
                )}

                {/* Accordion Pratinjau Alur Percakapan */}
                {script.length > 0 && (
                  <div className={styles.scenarioGuideAccordion}>
                    <button
                      type="button"
                      className={styles.scenarioGuideToggle}
                      onClick={() => setShowGuide((prev) => !prev)}
                      aria-expanded={showGuide}
                    >
                      <span>📖 Pratinjau Alur Dialog ({script.length} Langkah)</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--color-primary)" }}>
                        {showGuide ? "▲ Tutup" : "▼ Buka Alur"}
                      </span>
                    </button>

                    {showGuide && (
                      <ol className={styles.scenarioGuideList}>
                        {script.map((step, idx) => (
                          <li
                            key={idx}
                            className={`${styles.guideStepCard} ${
                              step.speaker === "USER" ? styles.guideStepCardUser : ""
                            }`}
                          >
                            <div className={styles.guideStepHead}>
                              <span
                                className={`${styles.guideStepSpeakerBadge} ${
                                  step.speaker === "USER" ? styles.guideStepSpeakerBadgeUser : ""
                                }`}
                              >
                                Langkah {step.step || idx + 1}: {step.speaker === "AI" ? scenario.mascotRole || "Miu-chan" : scenario.userRole || "Anda"}
                              </span>
                            </div>

                            {step.japaneseText && (
                              <p className={styles.guideStepJaText} lang="ja">
                                <FuriganaText text={step.japaneseText} />
                              </p>
                            )}
                            {step.romaji && <p className={styles.guideStepRomaji}>{step.romaji}</p>}
                            {step.indonesianText && (
                              <p className={styles.guideStepIdText}>{step.indonesianText}</p>
                            )}
                            {step.hintText && (
                              <div className={styles.guideStepTipBox}>💡 Tips: {step.hintText}</div>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {error && <Alert>{error}</Alert>}

                {/* Tombol Aksi Mulai */}
                <div className={styles.scenarioActions}>
                  <button
                    type="button"
                    className={styles.startBtn}
                    onClick={() => start(scenarioId)}
                    disabled={phase === "starting"}
                  >
                    <span>
                      {phase === "starting" ? "Menyiapkan percakapan…" : "Mulai Simulasi Percakapan 💬"}
                    </span>
                  </button>

                  <div className={styles.backLinkRow}>
                    <Link href="/ngobrol?tab=skenario">← Pilih skenario situasi lain</Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      );
    }

    // Default non-scenario chat intro
    return (
      <div className={styles.scenarioIntroScroller}>
        <section className={styles.intro}>
          <Mascot mood="semangat" size={130} />
          <h1 className={styles.introTitle}>Ngobrol Santai dengan Miu-chan</h1>
          <p className={styles.muted}>
            Miu-chan merespons sesuai tingkat kemampuanmu. Jangan takut salah, tata bahasa akan dikoreksi secara ramah dan lembut.
          </p>
          {error && <Alert>{error}</Alert>}
          <Button onClick={() => start(null)} disabled={phase === "starting"}>
            {phase === "starting" ? "Memanggil Miu-chan…" : "Mulai Ngobrol Bebas"}
          </Button>
        </section>
      </div>
    );
  }

  // ── 2. LAYAR LAPORAN AKHIR (COMPLETION REPORT) ──
  if (phase === "ended" && report) {
    return (
      <div style={{ overflowY: "auto", flex: 1, width: "100%", height: "100%" }}>
        <section className={styles.scenarioReportWrap}>
          <div className={styles.reportCard}>
            <span className={styles.reportHeaderBadge}>
              <TrophyIcon size={16} /> Misi Selesai Dijalankan
            </span>

            <Mascot mood="senang" size={120} />

            <h1 className={styles.reportTitle}>
              {scenario ? `Selesai: ${scenario.title}` : "Kerja Bagus, Hebat!"}
            </h1>

            <p className={styles.muted}>
              Kamu telah menyelesaikan latihan percakapan dua arah bersama Miu-chan.
            </p>

            {/* Statistik Evaluasi */}
            <div className={styles.reportStatsGrid}>
              <div className={styles.reportStatCol}>
                <span className={styles.reportStatVal}>{report.turns}</span>
                <span className={styles.reportStatLabel}>Giliran Dialog</span>
              </div>
              <div className={styles.reportStatCol}>
                <span className={styles.reportStatVal} style={{ color: report.corrections.length === 0 ? "#16a34a" : "#d97706" }}>
                  {report.corrections.length}
                </span>
                <span className={styles.reportStatLabel}>Koreksi Tata Bahasa</span>
              </div>
              <div className={styles.reportStatCol}>
                <span className={styles.reportStatVal} style={{ color: "#16a34a" }}>
                  100%
                </span>
                <span className={styles.reportStatLabel}>Kelengkapan Alur</span>
              </div>
            </div>

            {/* Daftar Koreksi Jika Ada */}
            {report.corrections.length > 0 && (
              <div style={{ textAlign: "left" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 10px" }}>
                  Catatan Peningkatan Pelafalan & Tata Bahasa:
                </h3>
                <ul className={styles.reportList}>
                  {report.corrections.map((c, i) => (
                    <li key={i} className={styles.reportCorrectionItem}>
                      <div className={styles.reportDiffRow}>
                        <span className={styles.reportOriginal} lang="ja">
                          <s>{c.original}</s>
                        </span>
                        <ArrowRightIcon size={14} />
                        <span className={styles.reportCorrected} lang="ja">
                          {c.corrected}
                        </span>
                      </div>
                      <p className={styles.reportExpl}>{c.explanation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Aksi Selesai */}
            <div className={styles.reportActionBtns}>
              <Button onClick={() => start(scenarioId)}>
                <SparklesIcon size={16} /> {scenario ? "Ulangi Skenario Ini" : "Ngobrol Lagi"}
              </Button>
              {scenario && (
                <Link
                  href="/ngobrol?tab=skenario"
                  style={{ fontWeight: 700, color: "var(--color-primary)", textDecoration: "none", fontSize: "0.88rem" }}
                >
                  ← Pilih Skenario Situasi Lain
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── 3. LAYAR PERCAKAPAN AKTIF (FLEX 100% HEIGHT) ──
  return (
    <div className={styles.chatScreenWrap}>
      {/* ── HEADER BILAH ATAS ── */}
      <header className={styles.chatHeader}>
        <div className={headerMetaStyles(styles)}>
          <div className={styles.headerLeft}>
            {scenario?.imageUrl ? (
              <div className={styles.headerThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scenario.imageUrl} alt="" className={styles.headerThumbImg} />
              </div>
            ) : (
              <Mascot mood={phase === "waiting" ? "berpikir" : MOOD[emotion]} size={42} />
            )}

            <div className={styles.headerMeta}>
              <h2 className={styles.headerTitle}>
                <span>{scenario?.title || "Ngobrol Bersama Miu-chan"}</span>
                {scenario?.mascotRole && (
                  <span className={styles.headerRoleBadge}>{scenario.mascotRole}</span>
                )}
              </h2>
              <p className={styles.headerSub}>
                <span>Level {session?.level || scenario?.levelCode || "N5"}</span>
                {scenario?.userRole && <span>· Peranmu: <strong>{scenario.userRole}</strong></span>}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {turnsLeft !== null && (
            <span className={styles.turnsBadge} title="Sisa giliran dialog">
              {turnsLeft} giliran
            </span>
          )}

          {script.length > 0 && (
            <button
              type="button"
              className={styles.guideBtnInHeader}
              onClick={() => setShowInChatGuide(true)}
              aria-label="Lihat panduan alur percakapan"
            >
              📖 Panduan
            </button>
          )}

          <button
            type="button"
            className={styles.endBtn}
            onClick={() => {
              if (window.confirm("Akhiri percakapan sekarang dan lihat evaluasi?")) {
                void end();
              }
            }}
          >
            Selesai
          </button>
        </div>
      </header>

      {/* ── BILAH MISI RINGKAS (COMPACT STRIP) ── */}
      {scenario?.goal && (
        <div className={styles.missionStrip}>
          <span className={styles.missionStripText} title={scenario.goal}>
            <span className={styles.missionStripTag}>Misi</span>
            <span>{scenario.goal}</span>
          </span>
          {script.length > 0 && (
            <span style={{ fontSize: "0.72rem", opacity: 0.85, flexShrink: 0 }}>
              Langkah {Math.min(userTurnsCount + 1, script.length)}/{script.length}
            </span>
          )}
        </div>
      )}

      {/* ── DAFTAR PESAN (SCROLLABLE MESSAGES AREA) ── */}
      <div className={styles.messagesArea} aria-live="polite">
        {messages.map((m) => {
          const isMascot = m.sender === "mascot";
          const translation = isMascot ? findTranslation(m.text) : null;
          const isTranslated = revealedTranslations[m.id];

          return (
            <div key={m.id} className={isMascot ? styles.mascotRow : styles.userRow}>
              <span className={styles.bubbleSpeakerLabel}>
                {isMascot
                  ? scenario?.mascotRole || "Miu-chan"
                  : scenario?.userRole || "Anda"}
              </span>

              {isMascot ? (
                <div className={styles.mascotBubbleWrap}>
                  <div className={styles.mascotBubble}>
                    <FuriganaText text={m.text} />
                  </div>

                  <div className={styles.mascotBubbleActions}>
                    <button
                      type="button"
                      className={styles.bubbleActionBtn}
                      onClick={() => speak(stripFurigana(m.text))}
                      title="Dengarkan pengucapan audio"
                    >
                      <VolumeIcon size={13} /> Dengar
                    </button>

                    {translation && (
                      <button
                        type="button"
                        className={styles.bubbleActionBtn}
                        onClick={() => toggleTranslation(m.id)}
                      >
                        {isTranslated ? "Sembunyikan Arti" : "Lihat Arti"}
                      </button>
                    )}
                  </div>

                  {isTranslated && translation && (
                    <div className={styles.bubbleTranslationBox}>
                      {translation.romaji && (
                        <p style={{ margin: "0 0 2px", color: "var(--color-text-muted)", fontSize: "0.72rem" }}>
                          {translation.romaji}
                        </p>
                      )}
                      <p style={{ margin: 0, fontWeight: 600 }}>{translation.indonesianText}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.userBubble} lang="ja">
                  {m.text}
                </div>
              )}

              {m.correction && <MicroFeedbackCard correction={m.correction} />}
            </div>
          );
        })}

        {phase === "waiting" && (
          <div className={styles.mascotRow}>
            <span className={styles.bubbleSpeakerLabel}>
              {scenario?.mascotRole || "Miu-chan"} sedang mengetik…
            </span>
            <div className={styles.typingBubble}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── SARAN JAWABAN CEPAT (DIALOGUE SUGGESTION CHIPS) ── */}
      {currentExpectedStep && currentExpectedStep.japaneseText && phase !== "waiting" && (
        <div className={styles.quickSuggestionsBar}>
          <span className={styles.quickSuggestionLabel}>
            <SparklesIcon size={13} /> Saran Jawaban:
          </span>

          <button
            type="button"
            className={styles.suggestionChip}
            onClick={() => {
              setDraft(stripFurigana(currentExpectedStep.japaneseText || ""));
              inputRef.current?.focus();
            }}
            title={currentExpectedStep.indonesianText || "Gunakan saran kalimat ini"}
          >
            <span lang="ja"><FuriganaText text={currentExpectedStep.japaneseText} /></span>
            {currentExpectedStep.indonesianText && (
              <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>
                ({currentExpectedStep.indonesianText})
              </span>
            )}
          </button>

          {currentExpectedStep.expectedKeyPhrases?.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              className={styles.suggestionChip}
              onClick={() => {
                setDraft(phrase);
                inputRef.current?.focus();
              }}
            >
              <span lang="ja">{phrase}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── NOTIFIKASI ERROR / SUARA ── */}
      {voiceError && (
        <div style={{ padding: "0 14px", margin: "4px 0" }}>
          <Alert>{voiceError}</Alert>
        </div>
      )}
      {error && (
        <div style={{ padding: "0 14px", margin: "4px 0" }}>
          <Alert>{error}</Alert>
        </div>
      )}

      {/* ── FORM COMPOSER (INPUT & MIC INPUT) ── */}
      <form
        className={styles.composerArea}
        onSubmit={async (e) => {
          e.preventDefault();
          const text = draft;
          if (await send(text)) {
            setDraft("");
          }
        }}
      >
        <button
          type="button"
          className={`${styles.micToggleBtn} ${isRecording ? styles.micToggleBtnActive : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={phase === "waiting" || transcribing || turnsLeft === 0}
          title={isRecording ? "Berhenti merekam" : "Bicara dalam bahasa Jepang (Mikrofon)"}
          aria-label={isRecording ? "Berhenti merekam" : "Bicara bahasa Jepang"}
        >
          {isRecording ? <StopIcon size={18} /> : <MicIcon size={18} />}
        </button>

        <input
          ref={inputRef}
          id="chat-input"
          lang="ja"
          className={styles.composerInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            isRecording
              ? "Sedang mendengarkan ucapanmu…"
              : transcribing
              ? "Mengenali ucapan bahasa Jepang…"
              : turnsLeft === 0
              ? "Giliran habis, akhiri percakapan untuk evaluasi"
              : `Balas sebagai ${scenario?.userRole || "siswa"} dalam bahasa Jepang…`
          }
          autoComplete="off"
          disabled={phase === "waiting" || turnsLeft === 0 || isRecording || transcribing}
        />

        <button
          type="submit"
          className={styles.sendSubmitBtn}
          disabled={phase === "waiting" || !draft.trim() || turnsLeft === 0 || isRecording}
          aria-label="Kirim pesan"
        >
          <span>Kirim</span>
          <SendIcon size={16} />
        </button>
      </form>

      {/* ── MODAL DRAWER PANDUAN ALUR LENGKAP ── */}
      {showInChatGuide && (
        <div className={styles.guideModalBackdrop} onClick={() => setShowInChatGuide(false)}>
          <div className={styles.guideModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.guideModalHead}>
              <h3 className={styles.guideModalTitle}>
                📖 Panduan Alur: {scenario?.title}
              </h3>
              <button
                type="button"
                className={styles.guideModalCloseBtn}
                onClick={() => setShowInChatGuide(false)}
                aria-label="Tutup panduan"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className={styles.guideModalBody}>
              <p style={{ margin: "0 0 4px", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                Target: {scenario?.goal}
              </p>

              {script.map((step, idx) => {
                const isUser = step.speaker === "USER";
                return (
                  <div
                    key={idx}
                    className={`${styles.guideStepCard} ${isUser ? styles.guideStepCardUser : ""}`}
                  >
                    <div className={styles.guideStepHead}>
                      <span
                        className={`${styles.guideStepSpeakerBadge} ${
                          isUser ? styles.guideStepSpeakerBadgeUser : ""
                        }`}
                      >
                        Langkah {step.step || idx + 1}: {isUser ? scenario?.userRole || "Anda" : scenario?.mascotRole || "Miu-chan"}
                      </span>
                    </div>

                    {step.japaneseText && (
                      <p className={styles.guideStepJaText} lang="ja">
                        <FuriganaText text={step.japaneseText} />
                      </p>
                    )}
                    {step.romaji && <p className={styles.guideStepRomaji}>{step.romaji}</p>}
                    {step.indonesianText && (
                      <p className={styles.guideStepIdText}>{step.indonesianText}</p>
                    )}
                    {step.hintText && (
                      <div className={styles.guideStepTipBox}>💡 Tips: {step.hintText}</div>
                    )}

                    {isUser && step.japaneseText && (
                      <button
                        type="button"
                        className={styles.useStepLineBtn}
                        onClick={() => {
                          setDraft(stripFurigana(step.japaneseText || ""));
                          setShowInChatGuide(false);
                          inputRef.current?.focus();
                        }}
                      >
                        Pakai Kalimat Ini
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function headerMetaStyles(styles: any) {
  return styles.headerLeftWrap || "";
}
